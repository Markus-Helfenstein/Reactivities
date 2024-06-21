using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Core;
using Application.Interfaces;
using Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Persistence;

namespace Application.Followers
{
    public class FollowToggle
    {
        public class Command : IRequest<Result<Unit>>
        {
            public string TargetUserName { get; set; }
        }

        public class Handler : IRequestHandler<Command, Result<Unit>>
        {
            private readonly DataContext _dataContext;
            private readonly IUserAccessor _userAccessor;
            public Handler(DataContext dataContext, IUserAccessor userAccessor)
            {
                this._userAccessor = userAccessor;
                this._dataContext = dataContext;
            }

            public async Task<Result<Unit>> Handle(Command request, CancellationToken cancellationToken)
            {      
                // Use s single roundtrip to load both users with their Followings collection using 
                // WHERE u.NormalizedUserName in ('BOB', 'TOM') / LEFT JOIN UserFollowings uf ON uf.ObserverId = u.Id           
                var arrayOfNormalizedUserNames = new string[] { _userAccessor.GetNormalizedUserName(), _userAccessor.NormalizeName(request.TargetUserName) };
                var users = await _dataContext.Users.Include(u => u.Followings)
                    .Where(u => arrayOfNormalizedUserNames.Contains(u.NormalizedUserName))
                    .ToListAsync();

                // result can be in any order
                var observer = users.FirstOrDefault(u => arrayOfNormalizedUserNames[0] == u.NormalizedUserName);
                var target = users.FirstOrDefault(u => arrayOfNormalizedUserNames[1] == u.NormalizedUserName);

                // target might not exist as it's passed from API request parameter
                if (null == observer || null == target) return null;

                var following = observer.Followings.FirstOrDefault(uf => uf.TargetId == target.Id);

                if (null == following)
                {
                    following = new UserFollowing
                    {
                        Observer = observer,
                        Target = target
                    };

                    observer.Followings.Add(following);
                }
                else
                {
                    observer.Followings.Remove(following);
                }

                return Result.HandleSaveChanges(await _dataContext.SaveChangesAsync(), errorMessage: "Failed to toggle following");
            }
        }
    }
}