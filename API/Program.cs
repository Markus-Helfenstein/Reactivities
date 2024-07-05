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

const string CHAT_HUB_ENDPOINT = "/chat";
const string CORS_POLICY = "CorsPolicy";
const string JWT_QUERY_KEY = "access_token";

static IServiceCollection AddApplicationServices(IServiceCollection services, IConfiguration config)
{
    // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
    services.AddEndpointsApiExplorer();
    services.AddSwaggerGen();
    services.AddDbContext<DataContext>(opt => 
    {
        opt.UseSqlServer(config.GetConnectionString("DefaultConnection"));
    });
    services.AddCors(opt => 
    {
        opt.AddPolicy(CORS_POLICY, policy =>
        {
            // TODO restrict for prod
            policy
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials()
                .WithOrigins("http://localhost:3000");
        });
    });
    services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(List.Handler).Assembly));
    services.AddAutoMapper(typeof(MappingProfiles).Assembly);
    services.AddFluentValidationAutoValidation();
    services.AddValidatorsFromAssemblyContaining<Create.CommandValidator>();
    services.AddHttpContextAccessor();
    services.AddScoped<IUserAccessor, UserAccessor>();
    services.AddScoped<IPhotoAccessor, PhotoAccessor>();
    services.Configure<CloudinarySettings>(config.GetSection("Cloudinary"));
    services.AddSignalR();

    return services;
}

static IServiceCollection AddIdentityServices(IServiceCollection services, IConfiguration config)
{
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
    var tokenService = new TokenService(config);

    services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(opt => 
        {
            opt.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = tokenService.GetKey(),
                // TODO (in course, things are kept simple as possible for as long as possible)
                ValidateIssuer = false,
                ValidateAudience = false
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

    return services;
}

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Course uses extension method classes, but I don't like extensions as it's not obvios where something is coming from or where to look for it.
builder.Services.AddControllers(opt =>
{
    var policy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
    opt.Filters.Add(new AuthorizeFilter(policy));
});
AddApplicationServices(builder.Services, builder.Configuration);
AddIdentityServices(builder.Services, builder.Configuration);

var app = builder.Build();

// Has to be on the top
app.UseMiddleware<ExceptionMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(CORS_POLICY);

// has to come before authorization!
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>(CHAT_HUB_ENDPOINT);

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