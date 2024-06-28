using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Core;
using Application.Interfaces;
using Application.Profiles;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Persistence;

namespace Application.Followers
{
    public class List
    {
        const string FOLLOWERS = "followers";
        const string FOLLOWING = "following";

        public class Query : IRequest<Result<List<Profiles.Profile>>>
        {
            public string Predicate { get; set; }
            public string UserName { get; set; }
        }

        public class Handler : IRequestHandler<Query, Result<List<Profiles.Profile>>>
        {
            private readonly DataContext _dataContext;
            private readonly IMapper _mapper;
            private readonly IUserAccessor _userAccessor;
            public Handler(DataContext dataContext, IMapper mapper, IUserAccessor userAccessor)
            {
                _userAccessor = userAccessor;
                _mapper = mapper;
                _dataContext = dataContext;
            }

            public async Task<Result<List<Profiles.Profile>>> Handle(Query request, CancellationToken cancellationToken)
            {
                var profiles = new List<Profiles.Profile>();
                // name has to match variable in MappingProfile!
                var currentUserName = _userAccessor.GetUserName();

                switch (request.Predicate)
                {
                    case FOLLOWERS:
                        profiles = await _dataContext.UserFollowings
                            .Where(uf => uf.Target.UserName == request.UserName)
                            .Select(uf => uf.Observer)
                            .ProjectTo<Profiles.Profile>(_mapper.ConfigurationProvider, new { currentUserName })
                            .ToListAsync();
                        break;
                    case FOLLOWING:
                        profiles = await _dataContext.UserFollowings
                            .Where(uf => uf.Observer.UserName == request.UserName)
                            .Select(uf => uf.Target)
                            .ProjectTo<Profiles.Profile>(_mapper.ConfigurationProvider, new { currentUserName })
                            .ToListAsync();
                        break;
                    default:
                        return null;
                }

                return Result.Success(profiles);
            }
        }
    }
}