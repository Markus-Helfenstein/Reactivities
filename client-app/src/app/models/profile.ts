import { User } from "./user";

export interface IProfile {
    userName: string;
    displayName: string;
    image?: string;
    bio?: string;
    followersCount: number;
    followingCount: number;
    isCurrentUserFollowing: boolean;
    photos?: IPhoto[];
}

export class Profile implements IProfile {
  userName: string = "";
  displayName: string = "";
  image?: string;
  bio?: string;
  followersCount: number = 0;
  followingCount: number = 0;
  isCurrentUserFollowing: boolean = false;
  photos?: IPhoto[];

  constructor(user: User) {
    if (user) {
      this.userName = user.userName;
      this.displayName = user.displayName;
      this.image = user.image;
    }
  }
}

export interface IPhoto {
  id: string;
  url: string;
  isMain: boolean;
}