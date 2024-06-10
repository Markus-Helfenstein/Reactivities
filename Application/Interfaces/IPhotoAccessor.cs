using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Photos;
using Microsoft.AspNetCore.Http;

namespace Application.Interfaces
{
    public interface IPhotoAccessor
    {
        // TODO I don't like the reference from Application to Microsoft.AspNetCore.Http
        Task<PhotoUploadResult> AddPhoto(IFormFile formFile);
        Task<string> DeletePhoto(string publicId);
    }
}