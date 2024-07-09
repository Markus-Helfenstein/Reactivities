import { createContext, useContext } from "react";
import ActivityStore from "./activityStore";
import CommonStore from "./commonStore";
import UserStore from "./userStore";
import ModalStore from "./modalStore";
import ProfileStore from "./profileStore";
import CommentStore from "./commentStore";
import { makeAutoObservable } from "mobx";

export interface IResettable {
    reset: () => void;
}

export default class Store implements IResettable {
	activityStore: ActivityStore = new ActivityStore();
	commonStore: CommonStore = new CommonStore();
	userStore: UserStore = new UserStore();
	modalStore: ModalStore = new ModalStore();
	profileStore: ProfileStore = new ProfileStore();
	commentStore: CommentStore = new CommentStore();

	constructor() {
		makeAutoObservable(this);
	}

	reset = () => {
		this.activityStore.reset();
		this.commonStore.reset();
		this.userStore.reset();
		this.modalStore.reset();
		this.profileStore.reset();
		this.commentStore.reset();
	};
}

export const store = new Store();

export const StoreContext = createContext(store);

export function useStore() {
    return useContext(StoreContext);
}