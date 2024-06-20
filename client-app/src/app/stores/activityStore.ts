import { makeAutoObservable, runInAction } from "mobx";
import { Activity, ActivityFormValues } from "../models/activity";
import agent from "../api/agent";
import { format } from "date-fns";
import { store } from "./store";
import { Profile } from "../models/profile";

export default class ActivityStore {
  activityRegistry = new Map<string, Activity>();
  selectedActivity: Activity | undefined = undefined;
  editMode = false;
  loading = false;
  loadingInitial = false;

  constructor() {
    makeAutoObservable(this);
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

  loadActivities = async () => {
    this.loadingInitial = true;
    try {
      const response = await agent.Activities.list();
      runInAction(() => {
        this.activityRegistry.clear();
        response.forEach(this.setActivity);
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
      const updatedActivity = {...this.getActivity(activityFormValues.id!), ...activityFormValues} as Activity;
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
  }

  clearSelectedActivity = () => {
    this.selectedActivity = undefined;
  }
}