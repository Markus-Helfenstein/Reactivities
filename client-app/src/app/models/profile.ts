import { User } from "./user";

export interface IProfile {
    userName: string;
    displayName: string;
    image?: string;
    bio?: string;
    photos?: IPhoto[];
}

export class Profile implements IProfile {
  userName: string = "";
  displayName: string = "";
  image?: string;
  bio?: string;
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