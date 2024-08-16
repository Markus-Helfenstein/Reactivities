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
        // SecretHasher https://stackoverflow.com/a/73125177/1876840
        private const int _saltSize = 16; // 128 bits
        private const int _keySize = 32; // 256 bits
        private const int _iterations = 10000;
        private const char segmentDelimiter = ':';
        private static readonly HashAlgorithmName _algorithm = HashAlgorithmName.SHA256;
        private readonly IConfiguration _config;

        public TokenService(IConfiguration config)
        {
            _config = config;
        }
        public TokenValidationParameters GetTokenValidationParameters(bool ignoreLifetime = false)
        {
            return new()
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = GetKey(),
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = !ignoreLifetime,
                ClockSkew = TimeSpan.Zero // Default would be 5 minutes
            };
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

        public byte[] GenerateRefreshTokenBytes()
        {
            return RandomNumberGenerator.GetBytes(_keySize);
        }

        public string ComputeRefreshTokenHashString(byte[] input)
        {
            byte[] salt = RandomNumberGenerator.GetBytes(_saltSize);
            byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
                input,
                salt,
                _iterations,
                _algorithm,
                _keySize
            );
            return string.Join(
                segmentDelimiter,
                Convert.ToHexString(hash),
                Convert.ToHexString(salt),
                _iterations,
                _algorithm
            );
        }

        public bool Verify(byte[] input, string hashString)
        {
            string[] segments = hashString.Split(segmentDelimiter);
            byte[] hash = Convert.FromHexString(segments[0]);
            byte[] salt = Convert.FromHexString(segments[1]);
            int iterations = int.Parse(segments[2]);
            HashAlgorithmName algorithm = new HashAlgorithmName(segments[3]);
            byte[] inputHash = Rfc2898DeriveBytes.Pbkdf2(
                input,
                salt,
                iterations,
                algorithm,
                hash.Length
            );
            return CryptographicOperations.FixedTimeEquals(inputHash, hash);
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