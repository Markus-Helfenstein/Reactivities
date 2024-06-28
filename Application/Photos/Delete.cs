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
    public class Delete
    {
        public class Command : IRequest<Result<Unit>>
        {
            public string Id { get; set; }
        }

        public class Handler : IRequestHandler<Command, Result<Unit>>
        {
            private readonly DataContext _dataContext;
            private readonly IUserAccessor _userAccessor;
            private readonly IPhotoAccessor _photoAccessor;
            
            public Handler(DataContext dataContext, IPhotoAccessor photoAccessor, IUserAccessor userAccessor)
            {
                _photoAccessor = photoAccessor;
                _userAccessor = userAccessor;
                _dataContext = dataContext;                
            }

            public async Task<Result<Unit>> Handle(Command request, CancellationToken cancellationToken)
            {
                var user = await _dataContext.Users.Include(u => u.Photos)
                    .FirstOrDefaultAsync(x => x.UserName == _userAccessor.GetUserName());

                if (null == user)
                {
                    return null;
                }

                var photo = user.Photos.FirstOrDefault(p => p.Id == request.Id);

                if (null == photo)
                {
                    return null;
                }

                if (photo.IsMain)
                {
                    return Result.Failure("You cannot delete your main photo");
                }

                var photoDeleteResult = await _photoAccessor.DeletePhoto(photo.Id);

                if (null == photoDeleteResult)
                {
                    return Result.Failure("Problem deleting photo from cloud");
                }

                user.Photos.Remove(photo);
                
                return Result.HandleSaveChanges(await _dataContext.SaveChangesAsync(), errorMessage: "Problem deleting photo from API");
            }
        }
    }
}