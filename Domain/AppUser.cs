using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;

namespace Domain
{
    public class AppUser : IdentityUser
    {
        public string DisplayName { get; set; }
        public string Bio { get; set; }
        public IList<ActivityAttendee> Activities { get; set; } = [];
        public IList<Photo> Photos { get; set; } = [];
        public IList<UserFollowing> Followings { get; set; } = [];
        public IList<UserFollowing> Followers { get; set; } = [];
        public IList<RefreshToken> RefreshTokens { get; set; } = [];
    }
}