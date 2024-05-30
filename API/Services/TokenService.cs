using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
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
                // TODO time should be shorter in production environment
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = credentials
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }


        /// <summary>
        /// TODO key management in production, so it won't be published to github. probably best by using a certificate?
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