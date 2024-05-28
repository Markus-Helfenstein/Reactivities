import { makeAutoObservable, runInAction } from "mobx";
import { Activity } from "../models/activity";
import agent from "../api/agent";
import { format } from "date-fns";

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
      }, {} as { [key: string]: Activity[] })
    );
  }

  // note that API sends date ISO strings. 
  // response.forEach(this.setActivity) works even though response objects 
  // don't really match the Activity interface in regards to the the date type.
  private setActivity = (activity: Activity) => {
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

  createActivity = async (activity: Activity) => {
    this.loading = true;
    try {
      await agent.Activities.create(activity);
      runInAction(() => {
        this.setActivity(activity);
        this.selectedActivity = activity;
        this.editMode = false;
      });
    } finally {
      runInAction(() => (this.loading = false));
    }
  };

  updateActivity = async (activity: Activity) => {
    this.loading = true;
    try {
      await agent.Activities.update(activity);
      runInAction(() => {
        this.setActivity(activity);
        this.selectedActivity = activity;
        this.editMode = false;
      });
    } finally {
      runInAction(() => (this.loading = false));
    }
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
}