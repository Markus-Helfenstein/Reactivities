import { makeAutoObservable, runInAction } from "mobx";
import { User, UserFormValues } from "../models/user";
import agent from "../api/agent";
import { IResettable, store } from "./store";
import { router } from "../router/Routes";
import { googleLogout } from "@react-oauth/google";

export default class UserStore implements IResettable {
	user: User | null = null;
	isGoogleSignInLoading = false;

	constructor() {
		makeAutoObservable(this);
	}
  
	reset = () => this.user = null;

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
		// components stay mounted. careful, state reset may cause reactions to trigger: see activityStore
		store.reset();
		// https://developers.google.com/identity/gsi/web/guides/automatic-sign-in-sign-out?hl=en#sign-out
		googleLogout();
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
	};

	setDisplayName = (displayName: string) => {
		if (this.user) {
			this.user.displayName = displayName;
		}
	};

	signInWithGoogle = async (accessToken: string) => {
		this.isGoogleSignInLoading = true;
		agent.Account.googleSignIn(accessToken)
			.then(this.signInCallback)
			.finally(() => runInAction(() => (this.isGoogleSignInLoading = false)));
	}
}