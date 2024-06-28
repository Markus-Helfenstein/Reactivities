using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Core;
using Application.Interfaces;
using Domain;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Persistence;

namespace Application.Activities
{
    public class UpdateAttendance
    {
        public class Command : IRequest<Result<Unit>>
        {
            public Guid Id { get; set; }
        }

        public class Handler : IRequestHandler<Command, Result<Unit>>
        {
            private readonly DataContext _context;
            private readonly IUserAccessor _userAccessor;
            public Handler(DataContext context, IUserAccessor userAccessor)
            {
                _userAccessor = userAccessor;
                _context = context;                
            }

            public async Task<Result<Unit>> Handle(Command request, CancellationToken cancellationToken)
            {
                var activity = await _context.Activities
                    .Include(a => a.Attendees)
                    .ThenInclude(aa => aa.AppUser)
                    .FirstOrDefaultAsync(a => a.Id == request.Id);
                
                if (null == activity) 
                {
                    return null;
                }

                var currentUserName = _userAccessor.GetUserName();
                var attendanceOfCurrentUser = activity.Attendees.FirstOrDefault(aa => aa.AppUser.UserName == currentUserName);

                if (null != attendanceOfCurrentUser)
                {
                    if (attendanceOfCurrentUser.IsHost)
                    {
                        // toggle cancellation of activity
                        activity.IsCancelled = !activity.IsCancelled;
                    }
                    else
                    {
                        // cancel attendance
                        activity.Attendees.Remove(attendanceOfCurrentUser);
                    }
                }
                else
                {
                    // sign up
                    var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.UserName == currentUserName);
                    
                    attendanceOfCurrentUser = new ActivityAttendee
                    {
                        AppUser = currentUser,
                        Activity = activity,
                        IsHost = false
                    };

                    activity.Attendees.Add(attendanceOfCurrentUser);
                }
                
                return Result.HandleSaveChanges(await _context.SaveChangesAsync(), errorMessage: "Failed to update attendance");
            }
        }
    }
}