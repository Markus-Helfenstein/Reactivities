import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { ChatComment } from "../models/comment";
import { makeAutoObservable, runInAction } from "mobx";
import { IResettable, store } from "./store";

export default class CommentStore implements IResettable {
    comments: ChatComment[] = [];
    hubConnection: HubConnection | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    reset = () => {
        this.comments = [];
        this.hubConnection = null;
    } 

    // note that error handling won't be done by axios interceptor, 
    // so we have to catch promises individually when working with HubConnection!

    createHubConnection = (activityId: string) => {
        if (store.activityStore.selectedActivity) {
            this.hubConnection = new HubConnectionBuilder()
                // TODO make configurable
                .withUrl(`${import.meta.env.VITE_CHAT_URL}?activityId=${activityId}`, {
                    // implicitly uses 'access_token' as query key
                    accessTokenFactory: () => store.userStore.user?.token as string
                })
                .withAutomaticReconnect()
                .configureLogging(LogLevel.Information)
                .build();

            var startUpPromise = this.hubConnection.start()
                .catch(error => console.log("Error establishing the connection: ", error));
            
            this.hubConnection.on("LoadComments", (comments: ChatComment[]) => {
                runInAction(() => {
                    comments.forEach(c => {
                        // TODO check if fix works with prod database
						// Very irritating fix for SQLite not returning timezone information.
						// Dates are delivered without trailing Z (like 2024-06-18T12:53:53.452),
                        // so JS handles them as local time. This fix makes sure input is interpreted as
                        // UTC time, and then it's converted to local time.
						c.createdAt = new Date(c.createdAt + "Z");
					})
                    this.comments = comments;
                });
            });

            this.hubConnection.on("ReceiveComment", (comment: ChatComment) => {
                runInAction(() => this.comments.unshift(comment));
            });

            // return the promise in case the caller wants to wait for the connection to be ready
            return startUpPromise;
        }
    }

    stopHubConnection = () => {
        return this.hubConnection?.stop()
            .catch(error => console.log("Error stopping the connection: ", error));
    }

    clearComments = () => {
        this.comments = [];
        return this.stopHubConnection();
    }

    addComment = (values: {activityId?: string, body: string}) => {
        values.activityId = store.activityStore.selectedActivity?.id;
        return this.hubConnection?.invoke("SendComment", values)
            .catch(error => console.log("Error adding a comment", error));
    }
}