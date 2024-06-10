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
                .ForMember(target => target.HostUserName, opt => opt.MapFrom(source => source.Attendees.FirstOrDefault(aa => aa.IsHost).AppUser.UserName));
            CreateMap<ActivityAttendee, AttendeeDto>()
                .ForMember(target => target.DisplayName, opt => opt.MapFrom(source => source.AppUser.DisplayName))
                .ForMember(target => target.UserName, opt => opt.MapFrom(source => source.AppUser.UserName))
                .ForMember(target => target.Bio, opt => opt.MapFrom(source => source.AppUser.Bio))
                .ForMember(target => target.Image, opt => opt.MapFrom(source => source.AppUser.Photos.FirstOrDefault(p => p.IsMain).Url));
            // Apart from Image, other properties of Profile and its Photo collection are mapped automagically
            CreateMap<AppUser, Profiles.Profile>()
                .ForMember(target => target.Image, opt => opt.MapFrom(source => source.Photos.FirstOrDefault(p => p.IsMain).Url));
        }
    }
}