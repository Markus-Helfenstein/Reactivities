import { makeAutoObservable, runInAction } from "mobx";
import { IPhoto, Profile } from "../models/profile";
import agent from "../api/agent";
import { store } from "./store";

export default class ProfileStore {
    profile: Profile | null = null;
    loadingProfile = false;
    isUploading = false;
    isLoading = false;

    constructor() {
        makeAutoObservable(this);
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
}