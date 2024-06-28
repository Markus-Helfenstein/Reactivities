using API.Extensions;
using Application.Core;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BaseApiController : ControllerBase
    {
        private IMediator _mediator;

        // TODO is ??= atomic? why not simply initialize field? course tutor told it would only be initialized once, but since it's not static, there will be a seperate field for every instantiation of a subclass
        protected IMediator Mediator => _mediator ??= HttpContext.RequestServices.GetService<IMediator>();

        private ActionResult HandleResultInternal<T>(Result<T> result, Action onSuccess = null)
        {
            if (null == result || (null == result.Value && result.IsSuccess)) 
                return NotFound();
            if (result.IsSuccess)
            {
                onSuccess?.Invoke();
                return Ok(result.Value);
            }
            return BadRequest(result.Error);
        }

        protected ActionResult HandleResult<T>(Result<T> result)
        {
            return HandleResultInternal(result);
        }

        /// <summary>
        /// Takes precedence over HandleResult<T>(Result<T> result) if parameter is a Result<PagedList<X>>
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="result"></param>
        /// <returns></returns>
        protected ActionResult HandleResult<T>(Result<PagedList<T>> result)
        {
            // local function, nice new feature
            void onSuccess() => Response.AddPaginationHeader(result.Value.CurrentPage, result.Value.PageSize, result.Value.TotalCount, result.Value.TotalPages);
            return HandleResultInternal(result, onSuccess);
        }
    }
}