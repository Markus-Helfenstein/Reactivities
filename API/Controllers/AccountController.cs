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
        public AccountController(UserManager<AppUser> userManager, TokenService tokenService, IConfiguration configuration, ILogger<AccountController> logger)
        {
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
        public async Task<ActionResult<UserDto>> RefreshToken()
        {
            var refreshToken = Request.Cookies[COOKIE_NAME_REFRESH_TOKEN];
            var normalizedEmail = _userManager.NormalizeEmail(User.FindFirstValue(ClaimTypes.Email));
            var user = await _userManager.Users
                .Include(u => u.RefreshTokens)
                .Include(u => u.Photos)
                .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail);

            if (null == user) return Unauthorized();

            var oldToken = user.RefreshTokens.FirstOrDefault(r => r.Token == refreshToken);

            if (null != oldToken && !oldToken.IsActive) return Unauthorized();

            // TODO doesn't this have to be persisted?
            if (null != oldToken) oldToken.Revoked = DateTime.UtcNow;

            // TODO why no await SetRefreshToken(user); here?
            // This issues a new JWT
            return CreateUserDto(user);
        }    

        private async Task SetRefreshToken(AppUser user)
        {
            var refreshToken = _tokenService.GenerateRefreshToken();
            user.RefreshTokens.Add(refreshToken);
            await _userManager.UpdateAsync(user);

            Response.Cookies.Append(COOKIE_NAME_REFRESH_TOKEN, refreshToken.Token, new CookieOptions
            {
                HttpOnly = true,
                Expires = refreshToken.Expires
            });
        }
        
        private UserDto CreateUserDto(AppUser user)
        {
            // TODO refactor to return profile and token
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