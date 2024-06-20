using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Core;
using Application.Interfaces;
using AutoMapper;
using Domain;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Persistence;

namespace Application.Comments
{
    public class Create
    {
        public class Command : IRequest<Result<CommentDto>>
        {
            public string Body { get; set; }
            public Guid ActivityId { get; set; }
        }

        public class CommandValidator : AbstractValidator<Command>
        {
            public CommandValidator()
            {
                RuleFor(c => c.Body).NotEmpty();
            }
        }

        public class Handler : IRequestHandler<Command, Result<CommentDto>>
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

            public async Task<Result<CommentDto>> Handle(Command request, CancellationToken cancellationToken)
            {
                var activity = await _dataContext.Activities.FindAsync(request.ActivityId);

                if (null == activity) return null;

                var user = await _dataContext.Users.Include(u => u.Photos)
                    .FirstOrDefaultAsync(x => x.NormalizedUserName == _userAccessor.GetNormalizedUserName());

                if (null == user) return null;

                var comment = new Comment
                {
                    Author = user,
                    Activity = activity,
                    Body = request.Body
                };

                activity.Comments.Add(comment);

                // comment.Id will be set according to the autoincrement PK value from the database
                // TODO check if Map is called after SaveChangesAsync has completed and whether Id is set properly
                return Result.HandleSaveChanges(await _dataContext.SaveChangesAsync(), 
                    successValue: _mapper.Map<CommentDto>(comment),
                    errorMessage: "Failed to add comment");
            }
        }
    }
}