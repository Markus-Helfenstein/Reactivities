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

        protected ActionResult HandleResult<T>(Result<T> result, Action onSuccess = null)
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

        protected ActionResult HandleResult<T>(Result<PagedList<T>> result)
        {
            return HandleResult(result, () => Response.AddPaginationHeader(result.Value.CurrentPage, result.Value.PageSize, result.Value.TotalCount, result.Value.TotalPages));
        }
    }
}