import { makeAutoObservable, reaction, runInAction } from "mobx";
import { IPhoto, Profile } from "../models/profile";
import agent from "../api/agent";
import { IResettable, store } from "./store";
import { IActivity } from "../models/activity";

export default class ProfileStore implements IResettable {
	profile: Profile | null = null;
	loadingProfile = false;
	isUploading = false;
	isLoading = false;
	followings: Profile[] = [];
	loadingFollowings = false;
	userActivities: Partial<IActivity>[] = [];
	loadingActivities = false;
	activeSection?: "about" | "photos" | "events" | "followers" | "following";
	activeSubSection?: "hosting" | "past" | "future";

	constructor() {
		makeAutoObservable(this);

		reaction(
			// when at least one of these changes
			() => [this.activeSection, this.activeSubSection],
			(newSelectionCombination) => {
				// evaluate which data that has to be loaded
				switch (newSelectionCombination[0]) {
					case "events":
						return this.loadUserActivities(newSelectionCombination[1]);
					case "followers":
						return this.loadFollowings("followers");
					case "following":
						return this.loadFollowings("following");
					default:
						break;
				}
			}
		);
	}

	reset = () => {
		this.profile = null;
		this.loadingProfile = false;
		this.isUploading = false;
		this.isLoading = false;
		this.followings = [];
		this.loadingFollowings = false;
		this.userActivities = [];
		this.loadingActivities = false;

		// causes reaction, but 'undefined' doesn't trigger data retrieval
		this.activeSection = undefined;
		this.activeSubSection = undefined;
	};

	setActiveSection = (activeSection: string | undefined) => {
		this.activeSection = activeSection as "about" | "photos" | "events" | "followers" | "following" | undefined;
	};

	setActiveSubSection = (activeSubSection: string | undefined) => {
		this.activeSubSection = activeSubSection as "hosting" | "past" | "future" | undefined;
	};

	get isCurrentUser() {
		return store.userStore.user && this.profile && store.userStore.user.userName === this.profile.userName;
	}

	loadProfile = async (userName: string) => {
		this.loadingProfile = true;
		try {
			const profileResponse = await agent.Profiles.get(userName);
			runInAction(() => (this.profile = profileResponse));
		} finally {
			runInAction(() => (this.loadingProfile = false));
		}
	};

	uploadPhoto = async (file: Blob) => {
		this.isUploading = true;
		try {
			const response = await agent.Profiles.uploadPhoto(file);
			const photo = response.data;
			runInAction(() => {
				if (this.profile) {
					this.profile.photos?.push(photo);
					if (photo.isMain && store.userStore.user) {
						store.userStore.setImage(photo.url);
						this.profile.image = photo.url;
					}
				}
			});
		} finally {
			runInAction(() => (this.isUploading = false));
		}
	};

	setMainPhoto = async (photo: IPhoto) => {
		this.isLoading = true;
		try {
			await agent.Profiles.setMainPhoto(photo.id);
			runInAction(() => {
				store.userStore.setImage(photo.url);
				if (this.profile && this.profile.photos) {
					const oldMainPhoto = this.profile.photos.find((p) => p.isMain);
					if (oldMainPhoto) oldMainPhoto.isMain = false;
					const newMainPhoto = this.profile.photos.find((p) => p.id === photo.id);
					if (newMainPhoto) newMainPhoto.isMain = true;
					this.profile.image = photo.url;
				}
			});
		} finally {
			runInAction(() => (this.isLoading = false));
		}
	};

	deletePhoto = async (id: string) => {
		this.isLoading = true;
		try {
			await agent.Profiles.deletePhoto(id);
			runInAction(() => {
				if (this.profile && this.profile.photos) {
					this.profile.photos = this.profile.photos.filter((p) => p.id !== id);
				}
			});
		} finally {
			runInAction(() => (this.isLoading = false));
		}
	};

	updateProfile = async (updatedProfile: Partial<Profile>) => {
		// Validation ensures that profile and profile.displayName are set
		this.isLoading = true;
		try {
			await agent.Profiles.update(updatedProfile);
			runInAction(() => {
				if (updatedProfile.displayName && updatedProfile.displayName !== store.userStore.user?.displayName) {
					store.userStore.setDisplayName(updatedProfile.displayName);
				}
				if (this.profile) {
					// Keep userName, image and photos, so it's easiest to map manually
					this.profile.displayName = updatedProfile.displayName!;
					this.profile.bio = updatedProfile.bio;
				}
			});
		} finally {
			runInAction(() => (this.isLoading = false));
		}
	};

	toggleFollowing = async (userName: string, isAboutToFollow: boolean) => {
		// guaranteed: store.userStore.user?.userName !== userName, since following button isn't shown for user's own profile
		this.isLoading = true;
		try {
			await agent.Profiles.toggleFollowing(userName);
			runInAction(() => {
				store.activityStore.updateAttendeeFollowing(userName);
				// user looking at his own profile, followingCount is affected
				if (this.profile && this.profile.userName === store.userStore.user?.userName) {
					isAboutToFollow ? this.profile.followingCount++ : this.profile.followingCount--;
				}
				// user looking at another profile and toggling its followed state, followersCount and isCurrentUserFollowing are affected
				if (this.profile && this.profile.userName !== store.userStore.user?.userName && this.profile.userName === userName) {
					isAboutToFollow ? this.profile.followersCount++ : this.profile.followersCount--;
					this.profile.isCurrentUserFollowing = !this.profile.isCurrentUserFollowing;
					// if user is looking at the followers tab of another profile, add or remove his own card when toggling profile's followed state
					if (this.activeSection === "followers") {
						if (isAboutToFollow) {
							// TODO better way to get profile of current user?
							this.followings = [...this.followings, new Profile(store.userStore.user!)];
						} else {
							this.followings = this.followings.filter((p) => p.userName !== store.userStore.user?.userName);
						}
					}
				}
				// look for the target card among the shown cards, and update its states: followersCount and isCurrentUserFollowing are affected
				this.followings.forEach((p) => {
					if (userName === p.userName) {
						p.isCurrentUserFollowing ? p.followersCount-- : p.followersCount++;
						p.isCurrentUserFollowing = !p.isCurrentUserFollowing;
					}
				});
			});
		} finally {
			runInAction(() => (this.isLoading = false));
		}
	};

	loadFollowings = async (predicate: string) => {
		this.loadingFollowings = true;
		try {
			const followings = await agent.Profiles.listFollowings(this.profile?.userName!, predicate);
			runInAction(() => {
				this.followings = followings;
			});
		} finally {
			runInAction(() => (this.loadingFollowings = false));
		}
	};

	loadUserActivities = async (predicate: string | undefined) => {
		this.loadingActivities = true;
		try {
			const activities = await agent.Profiles.listUserActivities(this.profile?.userName!, predicate);
			runInAction(() => {
				// TODO fix rendering of dates without timezone info on server side
				activities.forEach(a => a.date = new Date(a.date + 'Z'));
				this.userActivities = activities;
			});
		} finally {
			runInAction(() => (this.loadingActivities = false));
		}
	};
}