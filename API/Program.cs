using API.Middleware;
using API.Services;
using API.SignalR;
using Application.Activities;
using Application.Core;
using Application.Interfaces;
using Domain;
using FluentValidation;
using FluentValidation.AspNetCore;
using Infrastructure.Photos;
using Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Persistence;
using Microsoft.Extensions.Logging.AzureAppServices;
using API.Extensions;

const string CHAT_HUB_ENDPOINT = "/chat";
const string CORS_POLICY = "CorsPolicy";
const string JWT_QUERY_KEY = "access_token";

static void AddLogging(WebApplicationBuilder builder)
{
    if (builder.Environment.IsDevelopment())
    {
        builder.Services.AddLogging(loggingBuilder => loggingBuilder.AddDebug());
    }
    else
    {
        builder.Services.AddLogging(loggingBuilder => loggingBuilder.AddAzureWebAppDiagnostics());
    }
}

static void AddApplicationServices(WebApplicationBuilder builder)
{
    var services = builder.Services;
    // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
    services.AddEndpointsApiExplorer();
    services.AddSwaggerGen();
    services.AddDbContext<DataContext>(opt => 
    {
        opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
    });
    services.AddCors(opt => 
    {
        opt.AddPolicy(CORS_POLICY, policy =>
        {
            policy = policy
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials()
                .WithExposedHeaders("WWW-Authenticate", HttpExtensions.HEADER_NAME_PAGINATION);

            if (builder.Environment.IsDevelopment())
            {
                policy = policy
                    .WithOrigins("http://localhost:3000", "https://localhost:3000");
            }             
        });
    });
    services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(List.Handler).Assembly));
    services.AddAutoMapper(typeof(MappingProfiles).Assembly);
    services.AddFluentValidationAutoValidation();
    services.AddValidatorsFromAssemblyContaining<Create.CommandValidator>();
    services.AddHttpContextAccessor();
    services.AddScoped<IUserAccessor, UserAccessor>();
    services.AddScoped<IPhotoAccessor, PhotoAccessor>();
    services.Configure<CloudinarySettings>(builder.Configuration.GetSection("Cloudinary"));
    services.AddSignalR();
}

static void AddIdentityServices(WebApplicationBuilder builder)
{
    var services = builder.Services;
    services.AddIdentityCore<AppUser>(opt => 
    {
        opt.Password.RequireNonAlphanumeric = false;
        opt.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<DataContext>();

    // usually, TokenService is using Dependency Injection in scope of the http request
    services.AddScoped<TokenService>();
    
    // however, right now the Service provider is not yet ready, so we pass in the config manually.
    // this way, key recovery can be done by TokenService in one place instead of accessing config separately.
    var tokenService = new TokenService(builder.Configuration);

    services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(opt => 
        {
            opt.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = tokenService.GetKey(),
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero // Default would be 5 minutes
            };
            opt.Events = new JwtBearerEvents
            {
                // For SignalR, there is no HTTP header, so we pass the JWT in the query string
                OnMessageReceived = context => 
                {
                    var accessToken = context.Request.Query[JWT_QUERY_KEY];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments(CHAT_HUB_ENDPOINT))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                }
            };
        });

    services.AddAuthorization(opt => 
    {
        // has to match value in [Authorize(Policy = "IsActivityHost")] over controller actions
        opt.AddPolicy("IsActivityHost", policy => 
        {
            policy.Requirements.Add(new IsHostRequirement());
        });
    });
    services.AddTransient<IAuthorizationHandler, IsHostRequirementHandler>();
}

static void AddSecurityHeaders(WebApplication app)
{
    app.UseXContentTypeOptions(); // prevents mime-sniffing
    app.UseReferrerPolicy(opt => opt.StrictOriginWhenCrossOrigin()); // https://stackoverflow.com/questions/77058667/sign-in-with-google-using-gsi-fails-with-the-given-origin-is-not-allowed-for-th
    app.UseXXssProtection(opt => opt.EnabledWithBlockMode()); // It is recommended to have X-XSS-Protection: 0 and use the more powerful and flexible Content-Security-Policy header instead.
    app.UseXfo(opt => opt.Deny()); // disallow usage of app inside an iframe, prevents clickjacking
    app.UseCsp(opt => opt // whitelist content against XSS
        .BlockAllMixedContent() // disallows mixture of http and https content, only https is acceptable
        // following sources from our domain are approved content
        .StyleSources(s => s.Self().CustomSources("https://fonts.googleapis.com", "https://accounts.google.com/gsi/style")
            // https://scotthelme.co.uk/can-you-get-pwned-with-css/
            .UnsafeInline()) 
        .FontSources(s => s.Self().CustomSources("https://fonts.gstatic.com", "data:"))
        .FormActions(s => s.Self())
        .FrameAncestors(s => s.Self())
        .ImageSources(s => s.Self().CustomSources("blob:", "data:", "https://res.cloudinary.com", "https://lh3.googleusercontent.com"))
        .ScriptSources(s => s.Self().CustomSources("https://accounts.google.com/gsi/client"))
        .ConnectSources(s => s.Self().CustomSources("https://accounts.google.com/gsi/"))
        .FrameSources(s => s.CustomSources("https://accounts.google.com/gsi/"))
    );
    
    app.Use(async (context, next) =>
    {
        context.Response.Headers.Append("Cross-Origin-Opener-Policy", new Microsoft.Extensions.Primitives.StringValues(["same-origin", "same-origin-allow-popups"]));
        await next?.Invoke();
    });

    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }
    else 
    {
        app.Use(async (context, next) => 
        {
            context.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000");
            await next?.Invoke();
        });
    }

    app.UseCors(CORS_POLICY);
}

/*** BEGIN MAIN ***/

var builder = WebApplication.CreateBuilder(args);

AddLogging(builder);

// Add services to the container.
builder.Services.AddControllers(opt =>
{
    var policy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
    opt.Filters.Add(new AuthorizeFilter(policy));
});

// Course uses extension method classes, but I don't like extensions as it's not obvios where something is coming from or where to look for it.
AddApplicationServices(builder);
AddIdentityServices(builder);

var app = builder.Build();

// Has to be on the top
app.UseMiddleware<ExceptionMiddleware>();

// Security headers
AddSecurityHeaders(app);

// has to come before authorization!
app.UseAuthentication();
app.UseAuthorization();

// looks for index.html or similar and serves it if path without filename is specified
app.UseDefaultFiles();
// serves static files from wwwroot folder
app.UseStaticFiles();

app.MapControllers();
app.MapHub<ChatHub>(CHAT_HUB_ENDPOINT);
app.MapFallbackToController("Index", "Fallback");

using var scope = app.Services.CreateScope();
var services = scope.ServiceProvider;

try
{
    var context = services.GetRequiredService<DataContext>();
    var userManager = services.GetRequiredService<UserManager<AppUser>>();
    await context.Database.MigrateAsync();
    await Seed.SeedData(context, userManager);
}
catch (Exception ex)
{
    var logger = services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "An error occured during migration");
}

app.Run();