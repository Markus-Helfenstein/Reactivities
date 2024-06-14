import { makeAutoObservable, runInAction } from "mobx";
import { User, UserFormValues } from "../models/user";
import agent from "../api/agent";
import { store } from "./store";
import { router } from "../router/Routes";

export default class UserStore {
  user: User | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  get isLoggedIn() {
    return !!this.user;
  }

  private signInCallback = (user: User) => {
    runInAction(() => {
        store.commonStore.setToken(user.token);
        this.user = user;
        router.navigate("/activities");
        store.modalStore.closeModal();        
    });
  };

  login = async (creds: UserFormValues) => {
    return agent.Account.login(creds).then(this.signInCallback);
  };

  register = async (creds: UserFormValues) => {
    return agent.Account.register(creds).then(this.signInCallback);
  };

  logout = () => {
    store.commonStore.setToken(null);
    this.user = null;
    router.navigate("/");
  };

  getUser = async () => {
    const user = await agent.Account.current();
    runInAction(() => {
      this.user = user;
    });
  };

  setImage = (image: string) => {
    if (this.user) {
      this.user.image = image;
    }
  }
}