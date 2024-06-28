using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Core;
using Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Persistence;

namespace Application.Photos
{
    public class SetMain
    {
        public class Command : IRequest<Result<Unit>>
        {
            public string Id { get; set; }
        }

        public class Handler : IRequestHandler<Command, Result<Unit>>
        {
            private readonly DataContext _dataContext;
            private readonly IUserAccessor _userAccessor;
            public Handler(DataContext dataContext, IUserAccessor userAccessor)
            {
                _userAccessor = userAccessor;
                _dataContext = dataContext;                
            }

            public async Task<Result<Unit>> Handle(Command request, CancellationToken cancellationToken)
            {
                var user = await _dataContext.Users.Include(u => u.Photos)
                    .FirstOrDefaultAsync(u => u.UserName == _userAccessor.GetUserName());

                if (null == user)
                {
                    return null;
                }

                var photo = user.Photos.FirstOrDefault(p => p.Id == request.Id);

                if (null == photo)
                {
                    return null;
                }

                var oldMain = user.Photos.FirstOrDefault(p => p.IsMain);

                // Remove IsMain flag
                if (null != oldMain) 
                {
                    oldMain.IsMain = false;
                }

                // In a manipulated case where both refer to the same photo, this results in affected rows == 0, which is fine
                photo.IsMain = true;

                return Result.HandleSaveChanges(await _dataContext.SaveChangesAsync(), errorMessage: "Problem setting main photo");
            }
        }
    }
}