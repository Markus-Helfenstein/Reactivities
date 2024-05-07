import { makeAutoObservable, runInAction } from "mobx";
import { Activity } from "../models/activity";
import agent from "../api/agent";
import {v4 as uuid} from 'uuid';

export default class ActivityStore {
  activityRegistry = new Map<string, Activity>();
  selectedActivity: Activity | undefined = undefined;
  editMode = false;
  loading = false;
  loadingInitial = true;

  constructor() {
    makeAutoObservable(this);
  }

  get activitiesByDate() {
    return Array.from(this.activityRegistry.values()).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  }

  loadActivities = async () => {
    this.loadingInitial = true;
    try {
      const response = await agent.Activities.list();
      runInAction(() => {
        this.activityRegistry.clear();
        response.forEach((a) => {
          a.date = a.date.split("T")[0];
          this.activityRegistry.set(a.id, a);
        });
      });
    } finally {
      runInAction(() => (this.loadingInitial = false));
    }
  };

  selectActivity = (id: string) => {
    this.selectedActivity = this.activityRegistry.get(id);
  };

  cancelSelectActivity = () => {
    this.selectedActivity = undefined;
  };

  openForm = (id?: string) => {
    id ? this.selectActivity(id) : this.cancelSelectActivity();
    this.editMode = true;
  };

  closeForm = () => {
    this.editMode = false;
  };

  createActivity = async (activity: Activity) => {
    this.loading = true;
    activity.id = uuid();
    try {
      await agent.Activities.create(activity);
      runInAction(() => {
        this.activityRegistry.set(activity.id, activity);
        this.selectedActivity = activity;
        this.closeForm();
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
        this.activityRegistry.set(activity.id, activity);
        this.selectedActivity = activity;
        this.closeForm();
      });
    } finally {
      runInAction(() => (this.loading = false));
    }
  };

  deleteActivity = async (id: string) => {
    this.closeForm();
    this.loading = true;
    try {
      await agent.Activities.delete(id);
      runInAction(() => {
        this.activityRegistry.delete(id);
        if (this.selectedActivity?.id === id) {
          this.cancelSelectActivity();
        }
      });
    } finally {
      runInAction(() => (this.loading = false));
    }
  };
}