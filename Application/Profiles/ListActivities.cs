using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Application.Activities;
using Application.Core;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Persistence;

namespace Application.Profiles
{
    public class ListActivities
    {
        const string PAST = "past";
        const string HOSTING = "hosting";

        public class Query : IRequest<Result<List<UserActivityDto>>> 
        {
            public string Predicate { get; set; }
            public string UserName { get; set; }
        }

        public class Handler : IRequestHandler<Query, Result<List<UserActivityDto>>>
        {
            private readonly DataContext _dataContext;
            private readonly IMapper _mapper;
            public Handler(DataContext dataContext, IMapper mapper)
            {
                _mapper = mapper;
                _dataContext = dataContext;
            }

            public async Task<Result<List<UserActivityDto>>> Handle(Query request, CancellationToken cancellationToken)
            {
                var userAttendancesQuery = _dataContext.Users
                    .AsNoTracking()
                    .Where(u => u.UserName == request.UserName)
                    .SelectMany(u => u.Activities);

                var userActivitiesQuery = request.Predicate switch
                {
                    PAST => userAttendancesQuery
                        .Select(aa => aa.Activity)
                        .Where(a => a.Date < DateTime.UtcNow),
                    HOSTING => userAttendancesQuery
                        .Where(aa => aa.IsHost)
                        .Select(aa => aa.Activity),
                    _ => userAttendancesQuery
                        .Select(aa => aa.Activity)
                        .Where(a => a.Date >= DateTime.UtcNow),// default in future
                };

                return Result.Success(await userActivitiesQuery
                    .OrderBy(a => a.Date)
                    .ProjectTo<UserActivityDto>(_mapper.ConfigurationProvider)
                    .ToListAsync());
            }
        }
    }
}