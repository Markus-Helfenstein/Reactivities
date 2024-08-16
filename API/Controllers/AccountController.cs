using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Threading.Tasks;
using API.DTOs;
using API.Services;
using Application.Core;
using Domain;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Client;
using Microsoft.Net.Http.Headers;

namespace API.Controllers
{
    /// <summary>
    /// Since identity management isn't handled in application layer, 
    /// mediator isn't required and thus we don't derive from BaseApiController
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AccountController : ControllerBase
    {
        private const string COOKIE_NAME_REFRESH_TOKEN = "refreshToken";
        private const string BEARER_PREFIX = "Bearer ";

        private readonly UserManager<AppUser> _userManager;
        private readonly TokenService _tokenService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AccountController> _logger;
        private readonly IHostEnvironment _env;
        public AccountController(UserManager<AppUser> userManager, TokenService tokenService, IConfiguration configuration, ILogger<AccountController> logger, IHostEnvironment env)
        {
            _env = env;
            _configuration = configuration;
            _tokenService = tokenService;
            _userManager = userManager;  
            _logger = logger;        
        }

        [AllowAnonymous]
        [HttpPost("googleSignIn")]
        public async Task<ActionResult<UserDto>> GoogleSignIn(GoogleSignInDto input)
        {
            try
            {
                // Assert that JWT has been issued for this app
                var validationSettings = new GoogleJsonWebSignature.ValidationSettings
                { 
                    Audience = [_configuration["GoogleSignIn:Client-ID"]]
                };

                // Accesses google certificate from cache or from their API (server has to have web access!)
                var payload = await GoogleJsonWebSignature.ValidateAsync(input.AccessToken, validationSettings);

                var normalizedEmail = _userManager.NormalizeEmail(payload.Email);
                var user = await _userManager.Users.Include(p => p.Photos)
                    .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail);

                if (null == user) 
                {
                    // UserName is visible in profile links, but we don't want to show email to other users
                    // it still has to be unique in AspNetUsers table, so we simply use a new GUID
                    string userName = Guid.NewGuid().ToString();
                    user = new AppUser
                    {
                        DisplayName = payload.Name,
                        Email = payload.Email,
                        UserName = userName,
                        Photos = new List<Photo>
                        {
                            new Photo
                            {
                                Id = "gsi_" + userName,
                                Url = payload.Picture,
                                IsMain = true,
                            }
                        },
                    };

                    var result = await _userManager.CreateAsync(user);
                    if (!result.Succeeded) return BadRequest("Problem creating user account with google token");
                }
                
                await SetRefreshToken(user);
                return CreateUserDto(user);
            }
            catch (InvalidJwtException ex)
            {
                _logger.LogInformation(ex.ToString());
                return Unauthorized();
            }
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<ActionResult<UserDto>> Login(LoginDto loginDto)
        {
            var normalizedEmail = _userManager.NormalizeEmail(loginDto.Email);
            var user = await _userManager.Users
                .Include(p => p.Photos)
                .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail);

            if (null == user)
            {
                return Unauthorized();
            }

            var passwordCheckIsSuccessful = await _userManager.CheckPasswordAsync(user, loginDto.Password);

            if (passwordCheckIsSuccessful)
            {
                await SetRefreshToken(user);
                return CreateUserDto(user);
            }

            return Unauthorized();
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<ActionResult<UserDto>> Register(RegisterDto registerDto)
        {
            var normalizedUserName= _userManager.NormalizeName(registerDto.UserName);
            var userExistsWithSameUserName = await _userManager.Users.AnyAsync(u => u.NormalizedUserName == normalizedUserName);
            if (userExistsWithSameUserName)
            {
                ModelState.AddModelError("UserName", "User Name taken");
                return ValidationProblem();
            }
                        
            var normalizedEmail = _userManager.NormalizeEmail(registerDto.Email);
            var userExistsWithSameEmail = await _userManager.Users.AnyAsync(u => u.NormalizedEmail == normalizedEmail);
            if (userExistsWithSameEmail)
            {
                ModelState.AddModelError("Email", "Email taken");
                return ValidationProblem();
            }

            var user = new AppUser
            {
                DisplayName = registerDto.DisplayName,
                Email = registerDto.Email,
                UserName = registerDto.UserName,
            };

            var identityResult = await _userManager.CreateAsync(user, registerDto.Password);

            if (identityResult.Succeeded)
            {
                await SetRefreshToken(user);
                return CreateUserDto(user);
            }

            return BadRequest(identityResult.Errors);
        }

        /// <summary>
        /// This action is called when the website is loaded and a JWT from a previous browser session is present in local storage.
        /// JWT may be expired, but RefreshToken may still be active.
        /// [AllowAnonymous] skips JWT expiry validation, but Email claim has to be determined from Authorization header manually.
        /// </summary>
        /// <returns>UserDto with a fresh JWT. In addition the RefreshToken cookie is renewed.</returns>
        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> GetCurrentUser()
        {
            // Read JWT from authorization header and remove the 'Bearer ' prefix
            var accessToken = Request.Headers[HeaderNames.Authorization]
                .FirstOrDefault(h => h.StartsWith(BEARER_PREFIX, StringComparison.InvariantCultureIgnoreCase))
                ?.Substring(BEARER_PREFIX.Length);
            if (string.IsNullOrWhiteSpace(accessToken)) return NoContent();

            // Use the configured secret to validate the token, but ignore expiry
            var validationResult = await new JwtSecurityTokenHandler()
                .ValidateTokenAsync(accessToken, _tokenService.GetTokenValidationParameters(ignoreLifetime: true));
            if (!validationResult.IsValid) return NoContent();

            // Determine email address from JWT payload
            var emailAddress = validationResult.ClaimsIdentity.FindFirst(ClaimTypes.Email)?.Value;
            if (string.IsNullOrWhiteSpace(emailAddress)) return NoContent();

            // In contrast to RefreshToken and Logout actions, refreshToken cookie can be expired as well if user hasn't visited the site for 7 days
            return await HandleRefreshToken(emailAddress);
        }    

        [Authorize]
        [HttpPost("refreshToken")]
        public async Task<IActionResult> RefreshToken()
        {
            return await HandleRefreshToken();
        }    

        [AllowAnonymous]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            // discard 401 Unauthorized return values, we simply revoke and delete refresh token
            await HandleRefreshToken(isLoggingOut: true);
            return Ok();
        }

        private async Task<IActionResult> HandleRefreshToken(string emailAddressIfNotFromClaimsPrincipal = null, bool isLoggingOut = false)
        {
            var refreshToken = Request.Cookies[COOKIE_NAME_REFRESH_TOKEN];
            if (string.IsNullOrWhiteSpace(refreshToken)) return NoContent();

            byte[] refreshTokenBytes = new byte[(refreshToken.Length * 6) >> 3];
            if (!Convert.TryFromBase64String(refreshToken, refreshTokenBytes, out int bytesWritten))
            {
                // For example when user denies cookies or in DEV when running the React app on a different port
                return NoContent();
            }

            var normalizedEmail = _userManager.NormalizeEmail(emailAddressIfNotFromClaimsPrincipal ?? User.FindFirstValue(ClaimTypes.Email));
            if (string.IsNullOrWhiteSpace(normalizedEmail)) return Unauthorized();

            var user = await _userManager.Users
                .Include(u => u.RefreshTokens)
                .Include(u => u.Photos)
                .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail);
            if (null == user) return Unauthorized();

            // there may be multiple active browser sessions. fetch the entity whose hash matches the cookie value
            // don't worry about EF, expression runs locally            
            var oldToken = user.RefreshTokens.FirstOrDefault(r => !r.Revoked.HasValue && _tokenService.Verify(refreshTokenBytes, r.Token));
            if (null == oldToken) return Unauthorized();

            // if user's last used token is expired, client will redirect to login page and show a toast message
            // cookie of expired token is removed, so this won't happen a second time for the same token
            // at this point we can safely delete all expired tokens (no matter if they were revoked or not) to avoid storage cluttering 
            // sadly, there is no RemoveWhere(...) for IList, so we have to loop over the sequence manually and can't use foreach
            for (int i = user.RefreshTokens.Count - 1; i >= 0; i--)
            {
                if (user.RefreshTokens[i].IsExpired)
                {
                    user.RefreshTokens.RemoveAt(i);
                }
            }            
            
            // works even though token has been removed from the collection if it IsExpired
            if (oldToken.IsExpired)
            {
                await _userManager.UpdateAsync(user);
                // By using something similar to <Bearer error="invalid_token", error_description="The token expired'> 
                // from JwtBearerAuthentication, it can be handled in the same place in axios interceptor (rerouting and toast)
                Response.Headers.Append(HeaderNames.WWWAuthenticate, "The token expired");
                Response.Cookies.Delete(COOKIE_NAME_REFRESH_TOKEN);
                return Unauthorized();
            }

            // at this point {!r.Revoked.HasValue && !oldToken.IsExpired} which is equivalent to oldToken.IsActive
            if (isLoggingOut)
            { 
                // Makes sure IsActive == false
                oldToken.Revoked = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);
                Response.Cookies.Delete(COOKIE_NAME_REFRESH_TOKEN);
                return Ok();
            }
            else 
            {                
                // Refresh Token Rotation, which is more like a periodical replacement
                oldToken.RenewExpiry();
                // SetRefreshToken saves the recycled entity to save storage space
                await SetRefreshToken(user, oldToken);
                return new OkObjectResult(CreateUserDto(user)); 
            }
        }

        private async Task SetRefreshToken(AppUser user, RefreshToken refreshToken = null)
        {
            if (null == refreshToken)
            {
                refreshToken = new RefreshToken();
                user.RefreshTokens.Add(refreshToken);
            }

            var refreshTokenBytes = _tokenService.GenerateRefreshTokenBytes();
            refreshToken.Token = _tokenService.ComputeRefreshTokenHashString(refreshTokenBytes);
            await _userManager.UpdateAsync(user);

            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Expires = refreshToken.Expires
            };

            if (!_env.IsDevelopment())
            {
                // ports are different in dev, and one might not want to use https for whatever reason
                cookieOptions.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Strict;
                cookieOptions.Secure = true;
            }

            Response.Cookies.Append(COOKIE_NAME_REFRESH_TOKEN, Convert.ToBase64String(refreshTokenBytes), cookieOptions);
        }
        
        private UserDto CreateUserDto(AppUser user)
        {
            // TODO low priority: refactor to return profile with token, so it can be used in profile following tab
            return new UserDto
            {
                DisplayName = user.DisplayName,
                Image = user.Photos?.FirstOrDefault(p => p.IsMain)?.Url,
                Token = _tokenService.CreateToken(user),
                UserName = user.UserName
            };
        }
    }
}