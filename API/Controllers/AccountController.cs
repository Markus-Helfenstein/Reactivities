using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using API.DTOs;
using API.Services;
using Application.Core;
using Domain;
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
        public AccountController(UserManager<AppUser> userManager, TokenService tokenService)
        {
            _tokenService = tokenService;
            _userManager = userManager;            
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<ActionResult<UserDto>> Login(LoginDto loginDto)
        {
            var user = await _userManager.FindByEmailAsync(loginDto.Email);

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
            var user = await _userManager.FindByEmailAsync(User.FindFirstValue(ClaimTypes.Email));
            return CreateUserDto(user);
        }    
        
        private UserDto CreateUserDto(AppUser user)
        {
            return new UserDto
            {
                DisplayName = user.DisplayName,
                Image = null,
                Token = _tokenService.CreateToken(user),
                UserName = user.UserName
            };
        }
    }
}