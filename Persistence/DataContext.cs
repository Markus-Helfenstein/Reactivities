using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Domain;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Persistence
{
    public class DataContext : IdentityDbContext<AppUser>
    {
        public DataContext(DbContextOptions options) : base(options)
        {
        }

        public DbSet<Activity> Activities { get; set; }
        public DbSet<ActivityAttendee> ActivityAttendees { get; set; }
        public DbSet<Photo> Photos { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<UserFollowing> UserFollowings { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.HasDefaultSchema("rea");

            // For many to many relationships with a combined PK, its columns aren't nullable, and EF automatically makes the relationships cascading
            // This means, that if you remove an ActivityAttendee from the activity's Attendees collection and then save the activity, the ActivityAttendee record is deleted
            builder.Entity<ActivityAttendee>(b => 
            {
                // PK_ActivityAttendees
                b.HasKey(aa => new {aa.AppUserId, aa.ActivityId});

                // FK_ActivityAttendees_AspNetUsers_AppUserId
                b.HasOne(aa => aa.AppUser)
                    .WithMany(au => au.Activities)
                    .HasForeignKey(aa => aa.AppUserId);
                    
                // FK_ActivityAttendees_Activities_ActivityId
                b.HasOne(aa => aa.Activity)
                    .WithMany(a => a.Attendees)
                    .HasForeignKey(aa => aa.ActivityId);
            });

            builder.Entity<Comment>(b =>
            {
                // FK_Comments_Activities_ActivityId
                b.HasOne(c => c.Activity)
                    .WithMany(a => a.Comments)
                    .OnDelete(DeleteBehavior.Cascade);
            });                

            builder.Entity<UserFollowing>(b => 
            {
                // PK_UserFollowing
                b.HasKey(uf => new { uf.ObserverId, uf.TargetId });

                // FK_UserFollowing_AspNetUsers_ObserverId
                b.HasOne(uf => uf.Observer)
                    .WithMany(u => u.Followings)
                    .HasForeignKey(uf => uf.ObserverId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                // FK_UserFollowing_AspNetUsers_TargetId
                b.HasOne(uf => uf.Target)
                    .WithMany(u => u.Followers)
                    .HasForeignKey(uf => uf.TargetId)
                    .OnDelete(DeleteBehavior.ClientCascade);
            });

            // In contrast to many-to-many relationships with combined PK, unspecified relationships will be nullable by default.
            // So if you remove a RefreshToken from the user's collection, an orphan record with null in the FK column will remain.
            // Since AppUser and Activity are the principal entities in our domain, where there mustn't exist any orphan photos, tokens or similar,
            // it's best practice to define their collection relationships as cascading. 
            // For aggregates where there is no backwards reference from the collection item to the principal entity, this can also be achieved by using OwnsMany.
            builder.Entity<AppUser>(b =>
            {
                // TODO ef migration
                b.OwnsMany(u => u.Photos);
                b.OwnsMany(u => u.RefreshTokens);
            });
        }
    }
}