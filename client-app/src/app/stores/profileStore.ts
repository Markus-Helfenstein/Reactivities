import { makeAutoObservable, reaction, runInAction } from "mobx";
import { IPhoto, Profile } from "../models/profile";
import agent from "../api/agent";
import { store } from "./store";

export default class ProfileStore {
    profile: Profile | null = null;
    loadingProfile = false;
    isUploading = false;
    isLoading = false;
    followings: Profile[] = [];
    loadingFollowings = false;
    // TODO use tab names and put them into routing
    activeTab = 0;

    constructor() {
        makeAutoObservable(this);

        reaction(
            () => this.activeTab,
            (tabAboutToBeActive: number) => {
                switch (tabAboutToBeActive) {
                    case 3: return this.loadFollowings('followers');
                    case 4: return this.loadFollowings('following');
                    default: this.followings = []; break;
                }
            }
        );
    }

    setActiveTab = (activeTab: number) => {
        this.activeTab = activeTab;
    }

    get isCurrentUser() {
        return store.userStore.user && this.profile && store.userStore.user.userName === this.profile.userName;
    }

    loadProfile = async (userName: string) => {
        this.loadingProfile = true;
        try {
            const profileResponse = await agent.Profiles.get(userName);
            runInAction(() => this.profile = profileResponse);
        } finally {
            runInAction(() => this.loadingProfile = false);
        }
    }

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
    }

    setMainPhoto = async (photo: IPhoto) => {
        this.isLoading = true;
        try {
            await agent.Profiles.setMainPhoto(photo.id);
            runInAction(() => {
                store.userStore.setImage(photo.url);
                if (this.profile && this.profile.photos) {
                    const oldMainPhoto = this.profile.photos.find(p => p.isMain);                
                    if (oldMainPhoto) oldMainPhoto.isMain = false;
                    const newMainPhoto = this.profile.photos.find(p => p.id === photo.id);
                    if (newMainPhoto) newMainPhoto.isMain = true;
                    this.profile.image = photo.url;
                }
            });
		} finally {
			runInAction(() => (this.isLoading = false));
		}
    }

    deletePhoto = async (id: string) => {
        this.isLoading = true;
        try {
            await agent.Profiles.deletePhoto(id);
            runInAction(() => {
                if (this.profile && this.profile.photos) {
                    this.profile.photos = this.profile.photos.filter(p => p.id !== id);
                }
            });
		} finally {
			runInAction(() => (this.isLoading = false));
		}
    }

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
    }

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
                    // if user is looking at the followers tab of another profile, add or remove his card when toggling profile's followed state
                    if (this.activeTab === 3) {
                        if (isAboutToFollow) {
                            // TODO better way to get profile of current user?
                            this.followings = [...this.followings, new Profile(store.userStore.user!)];
                        } else {
                            this.followings = this.followings.filter(p => p.userName !== store.userStore.user?.userName);
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
	}

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
    }
}