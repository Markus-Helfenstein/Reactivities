using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Persistence;

namespace Infrastructure.Security
{
    public class IsHostRequirement : IAuthorizationRequirement
    {
        public const string POLICY_NAME = "IsActivityHost";        
    }

    public class IsHostRequirementHandler : AuthorizationHandler<IsHostRequirement>
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly DataContext _dataContext;
        public IsHostRequirementHandler(DataContext dataContext, IHttpContextAccessor httpContextAccessor)
        {
            _dataContext = dataContext;
            _httpContextAccessor = httpContextAccessor;
        }

        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, IsHostRequirement requirement)
        {
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (null != userId)
            {
                Guid activityId;
                string idStringFromRouteValues = _httpContextAccessor.HttpContext?.Request.RouteValues.FirstOrDefault(x => x.Key == "id").Value?.ToString();
                // "D" means 32 digits separated by hyphens: 00000000-0000-0000-0000-000000000000
                if (Guid.TryParseExact(idStringFromRouteValues, "D", out activityId))
                {
                    // https://stackoverflow.com/questions/38681091/how-would-you-call-async-method-in-a-method-which-cannot-be-async-in-c-sharp-wit
                    var attendance = await _dataContext.ActivityAttendees
                        .AsNoTracking()
                        .FirstOrDefaultAsync(aa => aa.AppUserId == userId && aa.ActivityId == activityId);
                        
                    if (null != attendance && attendance.IsHost)
                    {
                        context.Succeed(requirement);
                    }
                }
            }
        }
    }
}