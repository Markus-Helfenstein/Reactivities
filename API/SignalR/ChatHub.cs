using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Comments;
using MediatR;
using Microsoft.AspNetCore.SignalR;

namespace API.SignalR
{
    public class ChatHub : Hub
    {
        private readonly IMediator _mediator;
        public ChatHub(IMediator mediator)
        {
            _mediator = mediator;
        }

        public async Task SendComment(Create.Command command)
        {
            var comment = await _mediator.Send(command);

            await Clients.Group(command.ActivityId.ToString())
                .SendAsync("ReceiveComment", comment.Value);
        }

        // On connection, add client to activity-group and load previous comments
        // Note that we don't have to handle disconnects manually, as SignalR itself removes ConnectionId from any Groups 
        public override async Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();
            Guid activityId;
            // "D" means 32 digits separated by hyphens: 00000000-0000-0000-0000-000000000000
            if (!Guid.TryParseExact(httpContext.Request.Query["activityId"], "D", out activityId))
            {
                return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, activityId.ToString());
            var result = await _mediator.Send(new List.Query { ActivityId = activityId });
            await Clients.Caller.SendAsync("LoadComments", result.Value);
        }
    }
}