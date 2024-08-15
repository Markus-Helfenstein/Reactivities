import { IReactionDisposer, makeAutoObservable, reaction, runInAction } from "mobx";
import { Activity, ActivityFormValues } from "../models/activity";
import agent from "../api/agent";
import { format } from "date-fns";
import { IResettable, store } from "./store";
import { Profile } from "../models/profile";
import { Pagination, PagingParams } from "../models/pagination";

export default class ActivityStore implements IResettable {
	activityRegistry = new Map<string, Activity>();
	selectedActivity: Activity | undefined = undefined;
	editMode = false;
	loading = false;
	loadingInitial = false;
	pagination: Pagination | null = null;
	pagingParams = new PagingParams();
	predicate = new Map().set("all", true);
	reactionDisposer?: IReactionDisposer;

	constructor() {
		makeAutoObservable(this);
    	this.initializeReaction();
	}

	initializeReaction = () => {
		this.reactionDisposer = reaction(
			() => this.predicate.keys(),
			async () => {
				this.pagingParams = new PagingParams();
				this.activityRegistry.clear();
				return this.loadActivities();
			}
		);
	}

	turnOffReaction = () => {
		if (this.reactionDisposer) { 
			this.reactionDisposer(); 
			this.reactionDisposer = undefined;
		}
	}

  	reset = () => {
		this.activityRegistry.clear();
		this.clearSelectedActivity();
		this.editMode = false;
		this.loading = false;
		this.loadingInitial = false;
		this.pagination = null;
		this.pagingParams = new PagingParams();

		// Suppress activity reload that is triggered by reaction
		this.turnOffReaction();
		this.predicate = new Map().set("all", true);
		this.initializeReaction();
  	};

	setPredicate = (key: string, value: string | Date) => {
		if (key === "startDate") {
			// to ensure changes are detected
			this.predicate.delete(key);
			this.predicate.set(key, value);
		} else {
			this.predicate.forEach((_v, k) => {
				if (k !== "startDate") this.predicate.delete(k);
			});
			this.predicate.set(key, true);
		}
	};

	get axiosParams() {
		const params = new URLSearchParams();
		params.append("pageNumber", this.pagingParams.pageNumber.toString());
		params.append("pageSize", this.pagingParams.pageSize.toString());
		this.predicate.forEach((value, key) => {
			if (key === "startDate") {
				params.append(key, (value as Date).toISOString());
			} else {
				params.append(key, value);
			}
		});
		return params;
	}

	get activitiesByDate() {
		return Array.from(this.activityRegistry.values()).sort((a, b) => a.date!.getTime() - b.date!.getTime());
	}

	get groupedActivities() {
		return Object.entries(
			this.activitiesByDate.reduce((activitiesAccumulator, activity) => {
				const dateString = format(activity.date!, "dd MMM yyyy");
				activitiesAccumulator[dateString] = activitiesAccumulator[dateString] ? [...activitiesAccumulator[dateString], activity] : [activity];
				return activitiesAccumulator;
			}, {} as { [key: string]: Activity[] }) // like Dictionary<string, Activity[]>
		);
	}

	// note that API sends date ISO strings.
	// response.forEach(this.setActivity) works even though response objects
	// don't really match the Activity interface in regards to the the date type.
	private setActivity = (activity: Activity) => {
		const user = store.userStore.user;
		if (user) {
			// userName comparison doesn't have to be normalized here, as values are provided from the api
			// where it's guaranteed that userNames are guaranteed to be unique compared with InvariantCultureIgnoreCase
			activity.isGoing = activity.attendees!.some((aa) => aa.userName === user.userName);
			activity.isHost = activity.hostUserName === user.userName;
			activity.host = activity.attendees?.find((aa) => aa.userName === activity.hostUserName);
		}

		// in client app, date is using built in javascript type, together with date-fns for formatting purposes
		activity.date = new Date(activity.date!);
		this.activityRegistry.set(activity.id, activity);
	};

	private getActivity = (id: string) => {
		return this.activityRegistry.get(id);
	};

	setPagingParams = (pagingParams: PagingParams) => {
		this.pagingParams = pagingParams;
	};

	setPagination = (pagination: Pagination) => {
		this.pagination = pagination;
	};

	loadActivities = async (isInitialization = true) => {
		this.loadingInitial = true;
		try {
			const response = await agent.Activities.list(this.axiosParams);
			runInAction(() => {
				if (isInitialization) {
					// in DEV mode, request is sent twice
					this.activityRegistry.clear();
				}
				this.setPagination(response.pagination);
				response.data.forEach(this.setActivity);
			});
		} finally {
			runInAction(() => (this.loadingInitial = false));
		}
	};

	loadActivity = async (id: string) => {
		let activity = this.getActivity(id);
		if (activity) {
			this.selectedActivity = activity;
		} else {
			this.loadingInitial = true;
			try {
				activity = await agent.Activities.details(id);
				this.setActivity(activity);
				runInAction(() => {
					this.selectedActivity = activity;
				});
			} finally {
				runInAction(() => (this.loadingInitial = false));
			}
		}
		return activity;
	};

	createActivity = async (activityFormValues: ActivityFormValues) => {
		await agent.Activities.create(activityFormValues);
		runInAction(() => {
			const user = store.userStore.user;
			const newActivity = new Activity(activityFormValues);
			newActivity.hostUserName = user!.userName;
			newActivity.attendees = [new Profile(user!)];
			this.setActivity(newActivity);
			this.selectedActivity = newActivity;
		});
	};

	updateActivity = async (activityFormValues: ActivityFormValues) => {
		await agent.Activities.update(activityFormValues);
		runInAction(() => {
			// Populate a new object with values from old activity, overwrite these values with new ones, and cast object into proper type.
			const updatedActivity = { ...this.getActivity(activityFormValues.id!), ...activityFormValues } as Activity;
			this.activityRegistry.set(this.selectedActivity!.id, updatedActivity);
			this.selectedActivity = updatedActivity;
		});
	};

	deleteActivity = async (id: string) => {
		this.loading = true;
		try {
			await agent.Activities.delete(id);
			runInAction(() => {
				this.activityRegistry.delete(id);
			});
		} finally {
			runInAction(() => (this.loading = false));
		}
	};

	updateAttendance = async () => {
		const user = store.userStore.user;
		this.loading = true;
		try {
			await agent.Activities.attend(this.selectedActivity!.id);
			runInAction(() => {
				if (this.selectedActivity?.isGoing) {
					this.selectedActivity.attendees = this.selectedActivity.attendees?.filter((a) => a.userName !== user?.userName);
					this.selectedActivity.isGoing = false;
				} else {
					const attendee = new Profile(user!);
					this.selectedActivity?.attendees?.push(attendee);
					this.selectedActivity!.isGoing = true;
				}
				this.activityRegistry.set(this.selectedActivity!.id, this.selectedActivity!);
			});
		} finally {
			runInAction(() => (this.loading = false));
		}
	};

	cancelActivityToggle = async () => {
		this.loading = true;
		try {
			await agent.Activities.attend(this.selectedActivity!.id);
			runInAction(() => {
				this.selectedActivity!.isCancelled = !this.selectedActivity?.isCancelled;
				this.activityRegistry.set(this.selectedActivity!.id, this.selectedActivity!);
			});
		} finally {
			runInAction(() => (this.loading = false));
		}
	};

	clearSelectedActivity = () => {
		this.selectedActivity = undefined;
	};

	updateAttendeeFollowing = (userName: string) => {
		this.activityRegistry.forEach((activity) => {
			activity.attendees.forEach((attendee) => {
				if (attendee.userName === userName) {
					attendee.isCurrentUserFollowing ? attendee.followersCount-- : attendee.followersCount++;
					attendee.isCurrentUserFollowing = !attendee.isCurrentUserFollowing;
				}
			});
		});
	};
}