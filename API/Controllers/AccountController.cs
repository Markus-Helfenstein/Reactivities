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

        public class GTest{ 
            public string AccessToken { get; set; }
        }

        [AllowAnonymous]
        [HttpPost("googleSignIn")]
        public async Task<ActionResult<UserDto>> GoogleSignIn(GTest input)
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
                
            return CreateUserDto(user);
        }    
        
        private UserDto CreateUserDto(AppUser user)
        {
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