using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Application.Core;
using Application.Interfaces;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Persistence;

namespace Application.Activities
{
    public class List
    {
        public class Query : IRequest<Result<PagedList<ActivityDto>>> 
        {
            public ActivityParams Params { get; set; }
        }

        public class Handler : IRequestHandler<Query, Result<PagedList<ActivityDto>>>
        {
            private readonly DataContext _context;
            private readonly IMapper _mapper;
            private readonly IUserAccessor _userAccessor;
            public Handler(DataContext context, IMapper mapper, IUserAccessor userAccessor)
            {
                _userAccessor = userAccessor;
                _mapper = mapper;
                _context = context;
            }

            public async Task<Result<PagedList<ActivityDto>>> Handle(Query request, CancellationToken cancellationToken)
            {
                // name has to match variable in MappingProfile!
                var currentUserName = _userAccessor.GetUserName();

                var query = _context.Activities
                    .Where(a => a.Date >= request.Params.StartDate)
                    .OrderBy(a => a.Date)
                    // AutoMapper creates the select statement for us and omits unused info like user's password hashes
                    .ProjectTo<ActivityDto>(_mapper.ConfigurationProvider, new { currentUserName });
                    
                if (request.Params.IsGoing && !request.Params.IsHost && !request.Params.IsFollowedPersonGoing)
                {
                    query = query.Where(a => a.Attendees.Any(aa => aa.UserName == currentUserName));
                }
                if (request.Params.IsHost && !request.Params.IsGoing && !request.Params.IsFollowedPersonGoing)
                {
                    query = query.Where(a => a.HostUserName == currentUserName);
                }
                if (request.Params.IsFollowedPersonGoing && !request.Params.IsGoing && !request.Params.IsHost)
                {
                    query = query.Where(a => a.Attendees.Any(aa => aa.IsCurrentUserFollowing));
                }

                var activities = await query.ToPagedListAsync(request.Params.PageNumber, request.Params.PageSize);

                return Result.Success(activities);
            }
        }
    }
}