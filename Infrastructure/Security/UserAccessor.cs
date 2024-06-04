using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Application.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;

namespace Infrastructure.Security
{
    public class UserAccessor : IUserAccessor
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILookupNormalizer _lookupNormalizer;
        public UserAccessor(IHttpContextAccessor httpContextAccessor, ILookupNormalizer lookupNormalizer)
        {
            _lookupNormalizer = lookupNormalizer;
            _httpContextAccessor = httpContextAccessor;            
        }

        public string GetUserName()
        {
            return _httpContextAccessor.HttpContext.User.FindFirstValue(ClaimTypes.Name);
        }

        public string GetNormalizedUserName()
        {
            return _lookupNormalizer.NormalizeName(GetUserName());
        }
    }
}