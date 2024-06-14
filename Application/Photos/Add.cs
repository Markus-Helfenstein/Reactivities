using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Core;
using Application.Interfaces;
using Domain;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Persistence;

namespace Application.Photos
{
    public class Add
    {
        public class Command : IRequest<Result<Photo>>
        {
            // Has to match FormData in client agent
            public IFormFile File { get; set; }
        }

        public class Handler : IRequestHandler<Command, Result<Photo>>
        {
            private readonly IPhotoAccessor _photoAccessor;
            private readonly IUserAccessor _userAccessor;
            private readonly DataContext _dataContext;
            public Handler(DataContext dataContext, IPhotoAccessor photoAccessor, IUserAccessor userAccessor)
            {
                _dataContext = dataContext;
                _userAccessor = userAccessor;
                _photoAccessor = photoAccessor;                
            }

            public async Task<Result<Photo>> Handle(Command request, CancellationToken cancellationToken)
            {
                var user = await _dataContext.Users.Include(u => u.Photos)
                    .FirstOrDefaultAsync(x => x.NormalizedUserName == _userAccessor.GetNormalizedUserName());

                if (null == user)
                {
                    return null;
                }

                var photoUploadResult = await _photoAccessor.AddPhoto(request.File);

                var photo = new Photo
                {
                    Url = photoUploadResult.Url,
                    Id = photoUploadResult.PublicId
                };

                if (!user.Photos.Any(p => p.IsMain))
                {
                    photo.IsMain = true;
                }

                user.Photos.Add(photo);
                var affectedRows = await _dataContext.SaveChangesAsync();

                if (1 > affectedRows) 
                {
                    return Result<Photo>.Failure("Problem adding photo");
                }

                return Result<Photo>.Success(photo);
            }
        }
    }
}