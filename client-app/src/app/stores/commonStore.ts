import { makeAutoObservable, reaction } from "mobx";
import { ServerError } from "../models/serverError";

export default class CommonStore {
  error: ServerError | null = null;
  // TODO token mustn't be stored in local storage!!!
  // https://www.youtube.com/watch?v=Qm64zinOVpc
  // https://stackoverflow.com/questions/27067251/where-to-store-jwt-in-browser-how-to-protect-against-csrf
  token: string | null | undefined = localStorage.getItem('jwt');
  appLoaded: boolean = false;

  constructor() {
    makeAutoObservable(this);

    reaction(
        () => this.token,
        token => {
            if (token) {
                localStorage.setItem("jwt", token);
            } else {
                localStorage.removeItem('jwt');
            }
        }
    )
  }

  setServerError = (error: ServerError) => {
    this.error = error;
  }

  setToken = (token: string | null | undefined) => {
    this.token = token;
  }

  setAppLoaded = () => {
    this.appLoaded = true;
  }
}