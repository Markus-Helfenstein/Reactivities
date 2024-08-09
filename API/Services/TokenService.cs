using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Domain;
using Microsoft.IdentityModel.Tokens;

namespace API.Services
{
    public class TokenService
    {
        private readonly IConfiguration _config;

        public TokenService(IConfiguration config)
        {
            _config = config;
        }

        public string CreateToken(AppUser user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.UserName),
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email),
            };

            var credentials = new SigningCredentials(GetKey(), SecurityAlgorithms.HmacSha512Signature);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(10),
                SigningCredentials = credentials
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public RefreshToken GenerateRefreshToken()
        {
            var randomNumber = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return new RefreshToken { Token = Convert.ToBase64String(randomNumber) };
        }

        /// <summary>
        /// For DEV, configure this secret in appsettings.json that won't be checked in to github.
        /// For PRD, configure it in environment variables in platform dashboard
        /// Base64 string of a random 64 byte key was generated with the following powershell command:
        /// [Convert]::ToBase64String((1..64|%{[byte](Get-Random -Max 256)}))
        /// </summary>
        /// <returns>SecurityKey used to sign JWT tokens</returns>
        public SecurityKey GetKey()
        {
            var keyBytes = Convert.FromBase64String(_config["TokenKey"]);
            return new SymmetricSecurityKey(keyBytes);
        }
    }
}