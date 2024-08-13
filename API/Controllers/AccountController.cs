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
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

        [Authorize]
        [HttpGet]
        public async Task<ActionResult<UserDto>> GetCurrentUser()
        {
            var normalizedEmail = _userManager.NormalizeEmail(User.FindFirstValue(ClaimTypes.Email));
            var user = await _userManager.Users
                .Include(p => p.Photos)
                .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail);
                
            await SetRefreshToken(user);
            return CreateUserDto(user);
        }    

        [Authorize]
        [HttpPost("refreshToken")]
        public async Task<IActionResult> RefreshToken()
        {
            return await HandleRefreshToken(async (user, oldToken) => 
            {
                // Refresh Token Rotation, which is more like a periodical replacement
                await SetRefreshToken(user, oldToken);
                return new OkObjectResult(CreateUserDto(user));     
            });
        }    

        [AllowAnonymous]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            // discard 401 Unauthorized, we simply revoke and delete refresh token
            // action can also be used to keep webapp and sqldb from going idle
            await HandleRefreshToken();
            Response.Cookies.Delete(COOKIE_NAME_REFRESH_TOKEN);
            return Ok();
        }

        private async Task<IActionResult> HandleRefreshToken(Func<AppUser, RefreshToken, Task<IActionResult>> onRefresh = null)
        {
            var refreshToken = Request.Cookies[COOKIE_NAME_REFRESH_TOKEN];
            var normalizedEmail = _userManager.NormalizeEmail(User.FindFirstValue(ClaimTypes.Email));
            var user = await _userManager.Users
                .Include(u => u.RefreshTokens)
                .Include(u => u.Photos)
                .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail);

            if (null == user) return Unauthorized();

            // there may be multiple active browser sessions. fetch the entity whose hash matches the cookie value
            // don't worry about EF, expression runs locally            
            var oldToken = user.RefreshTokens.FirstOrDefault(r => r.IsActive && _tokenService.Verify(Convert.FromBase64String(refreshToken), r.Token));

            if (null == oldToken) return Unauthorized();

            if (null != onRefresh)
            {
                // Recycle the entity to save storage space
                oldToken.RenewExpiry();
                return await onRefresh(user, oldToken);
            }
            else
            {
                // Makes sure IsActive == false
                oldToken.Revoked = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);
                return Ok();
            }
        }

        private async Task SetRefreshToken(AppUser user, RefreshToken refreshToken = null)
        {
            if (null == refreshToken)
            {
                refreshToken = new RefreshToken { AppUser = user };
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
                cookieOptions.SameSite = SameSiteMode.Strict;
                cookieOptions.Secure = true;
            }

            Response.Cookies.Append(COOKIE_NAME_REFRESH_TOKEN, Convert.ToBase64String(refreshTokenBytes), cookieOptions);
        }
        
        private UserDto CreateUserDto(AppUser user)
        {
            // TODO refactor to return profile with token, so it can be used in profile following tab
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