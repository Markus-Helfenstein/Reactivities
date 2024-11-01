import { makeAutoObservable, runInAction } from "mobx";
import { User, UserFormValues } from "../models/user";
import agent from "../api/agent";
import { IResettable, store } from "./store";
import { router } from "../router/Routes";
import { googleLogout } from "@react-oauth/google";

export default class UserStore implements IResettable {
	user: User | null = null;
	isSignInLoading = false;
	refreshTokenTimeoutId?: number;
	isLoggingOut = false;

	constructor() {
		makeAutoObservable(this);
	}

	reset = () => (this.user = null);

	get isLoggedIn() {
		return !!this.user;
	}

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

	private signInCallback = (user: User) => {
		runInAction(() => {
			store.commonStore.setToken(user.token);
			this.user = user;
			this.startRefreshTokenTimer(user);
		});
	};

	private signInAndRedirectCallback = async (user: User) => {
		this.signInCallback(user);
		return runInAction(() => {
			store.modalStore.closeModal();
			return router.navigate("/activities");
		});
	};

	/* BEGIN API CALLS */

	logout = async (skipApiLogout: boolean = false) => {
		this.isLoggingOut = true;
		try {
			this.stopRefreshTokenTimer();
			// components stay mounted. careful, state reset may cause reactions to trigger
			store.activityStore.turnOffReaction();
			if (!skipApiLogout) {
				await agent.Account.logout();
			}
			await router.navigate("/");
			runInAction(() => {
				// reinitializes reactions afterwards
				store.reset();
				// https://developers.google.com/identity/gsi/web/guides/automatic-sign-in-sign-out?hl=en#sign-out
				googleLogout();
			});						
		} finally {
			runInAction(() => this.isLoggingOut = false);
		}
	};

	login = async (creds: UserFormValues) => {
		return agent.Account.login(creds)
			.then(this.signInAndRedirectCallback);
	};

	register = async (creds: UserFormValues) => {
		return agent.Account.register(creds)
			.then(this.signInAndRedirectCallback);
	};

	// Called on app load to get user by JWT from local storage if user info isn't present
	getUser = async () => {
		return agent.Account.current()
			.then(this.signInCallback);
	};

	signInWithGoogle = async (accessToken: string) => {
		this.isSignInLoading = true;
		agent.Account.googleSignIn(accessToken)
			.then(this.signInAndRedirectCallback)
			.finally(() => runInAction(() => (this.isSignInLoading = false)));
	};

	refreshToken = async () => {
		this.stopRefreshTokenTimer();
		return agent.Account.refreshToken()
			.then(this.signInCallback);
	};

	/* END API CALLS */

	private startRefreshTokenTimer(user: User) {
		if (!user || !user.token) return;
		const jwtPayload = JSON.parse(atob(user.token.split(".")[1]));
		// exp is in seconds, Date in milliseconds
		const expires = new Date(jwtPayload.exp * 1000);
		// timespan from now to 60 seconds before expiration
		const timeout = expires.getTime() - Date.now() - 60 * 1000;
		// call refreshToken method 60 seconds before expiration and store TimeoutId
		this.refreshTokenTimeoutId = setTimeout(this.refreshToken, timeout);
	}

	private stopRefreshTokenTimer() {
		clearTimeout(this.refreshTokenTimeoutId);
	}
}