using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Activities;
using AutoMapper;
using Domain;

namespace Application.Core
{
    public class MappingProfiles : Profile
    {
        public MappingProfiles()
        {
            CreateMap<Activity, Activity>();
            CreateMap<Activity, ActivityDto>()
                .ForMember(target => target.HostUserName, map => map.MapFrom(source => source.Attendees.FirstOrDefault(aa => aa.IsHost).AppUser.UserName));
            CreateMap<ActivityAttendee, Profiles.Profile>()
                .ForMember(target => target.DisplayName, map => map.MapFrom(source => source.AppUser.DisplayName))
                .ForMember(target => target.UserName, map => map.MapFrom(source => source.AppUser.UserName))
                .ForMember(target => target.Bio, map => map.MapFrom(source => source.AppUser.Bio));
        }
    }
}