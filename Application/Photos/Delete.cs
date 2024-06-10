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
                    .FirstOrDefaultAsync(x => x.NormalizedUserName == _userAccessor.GetNormalizedUserName());

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
                    return Result<Unit>.Failure("You cannot delete your main photo");
                }

                var photoDeleteResult = await _photoAccessor.DeletePhoto(photo.Id);

                if (null == photoDeleteResult)
                {
                    return Result<Unit>.Failure("Problem deleting photo from cloud");
                }

                user.Photos.Remove(photo);
                var affectedRows = await _dataContext.SaveChangesAsync();

                if (1 > affectedRows) 
                {
                    return Result<Unit>.Failure("Problem deleting photo from API");
                }

                return Result<Unit>.Success(Unit.Value);
            }
        }
    }
}