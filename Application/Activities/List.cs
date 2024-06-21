using System;
using System.Collections.Generic;
using System.Linq;
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
        public class Query : IRequest<Result<List<ActivityDto>>> {}

        public class Handler : IRequestHandler<Query, Result<List<ActivityDto>>>
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

            public async Task<Result<List<ActivityDto>>> Handle(Query request, CancellationToken cancellationToken)
            {
                // name has to match variable in MappingProfile!
                var currentNormalizedUserName = _userAccessor.GetNormalizedUserName();

                var activities = await _context.Activities
                    // AutoMapper creates the select statement for us and omits unused info like user's password hashes
                    .ProjectTo<ActivityDto>(_mapper.ConfigurationProvider, new { currentNormalizedUserName })
                    .ToListAsync(cancellationToken);

                return Result.Success(activities);
            }
        }
    }
}