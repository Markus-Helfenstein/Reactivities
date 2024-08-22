import axios, { AxiosError, AxiosResponse } from "axios";
import { Activity, ActivityFormValues, IActivity } from "../models/activity";
import { toast } from "react-toastify";
import { router } from "../router/Routes";
import { store } from "../stores/store";
import { User, UserFormValues } from "../models/user";
import { IPhoto, Profile } from "../models/profile";
import { PaginatedResult } from "../models/pagination";

const sleep = (delay: number) => {
    return new Promise(resolve =>
        setTimeout(resolve, delay)
    );
}

// Without this, cookies from backend can't be set in DEV where Vite runs on a separate port 
if (import.meta.env.DEV) {
    axios.defaults.withCredentials = true;
} 
axios.defaults.baseURL = import.meta.env.VITE_API_URL;

axios.interceptors.request.use(config => {
    const token = store.commonStore.token;
    // in course, headers is nullable, but this seems to no longer be the case
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axios.interceptors.response.use(async response => {
    // in DEV, add fake delay to make loading spinners notable
    if (import.meta.env.DEV) await sleep(1000);
    const pagination = response.headers["pagination"];
    if (pagination) {
        response.data = new PaginatedResult(response.data, JSON.parse(pagination));
        return response as AxiosResponse<PaginatedResult<unknown>>
    }
    return response;
}, (error: AxiosError) => {
    const {data, status, config, headers} = error.response as AxiosResponse;
    switch (status) {
        case 400:
            // ActivityController returns 400 when URL contains an ID that can't be converted into a GUID. Redirect to 404 page instead
            if (config.method === 'get' && Object.prototype.hasOwnProperty.call(data.errors, 'id')) {
                router.navigate('not-found');
            } else if (data.errors) {
                const modelStateErrors = [];
                for (const key in data.errors) {
                    if (data.errors[key]) {
                        modelStateErrors.push(data.errors[key]);
                    }
                }
                throw modelStateErrors.flat();
            } else {
                toast.error(data);
            }
            break;
        case 401:
            if (headers["www-authenticate"]?.includes('The token expired')) {         
                // logout client side only, since getUser already managed server side logout            
                store.userStore.logout(true)
                    .then(() => toast.warn("Session expired - please log in again"));
            } else {
                toast.error("unauthorized");
            }
            break;
        case 403:
            toast.error("forbidden");
            break;
        case 404:
            router.navigate('/not-found');
            break;
        case 500:
        default:
            store.commonStore.setServerError(data);
            router.navigate('/server-error');
            break;
    }
    return Promise.reject(error);
})

const responseBody = <T>(response: AxiosResponse<T>) => response.data;

const requests = {
  get: <T>(url: string) => axios.get<T>(url).then(responseBody),
  post: <T>(url: string, body: {}) => axios.post<T>(url, body).then(responseBody),
  put: <T>(url: string, body: {}) => axios.put<T>(url, body).then(responseBody),
  del: <T>(url: string) => axios.delete<T>(url).then(responseBody),
};
 
const Activities = {
  list: (params: URLSearchParams) => axios.get<PaginatedResult<Activity[]>>("/activities", {params}).then(responseBody),
  details: (id: string) => requests.get<Activity>(`/activities/${id}`),
  create: (activity: ActivityFormValues) => requests.post<void>("/activities", activity),
  update: (activity: ActivityFormValues) => requests.put<void>(`/activities/${activity.id}`, activity),
  delete: (id: string) => requests.del<void>(`/activities/${id}`),
  attend: (id: string) => requests.post<void>(`/activities/${id}/attend`, {}),
};

const Account = {
	current: () => requests.get<User>("/account"),
	login: (userFormValues: UserFormValues) => requests.post<User>("/account/login", userFormValues),
	register: (userFormValues: UserFormValues) => requests.post<User>("/account/register", userFormValues),
	googleSignIn: (accessToken: string) => requests.post<User>(`/account/googleSignIn`, { accessToken }),
	refreshToken: () => requests.post<User>("/account/refreshToken", {}),
	logout: () => requests.post<void>("/account/logout", {}),
};

const Profiles = {
	get: (userName: string) => requests.get<Profile>(`/profiles/${userName}`),
	uploadPhoto: (file: Blob) => {
		let formData = new FormData();
		// has to match property in API
		formData.append("File", file);
		return axios.post<IPhoto>("photos", formData, {
			headers: { "Conent-Type": "multipart/form-data" },
		});
	},
	setMainPhoto: (id: string) => requests.post(`/photos/${id}/setMain`, {}),
	deletePhoto: (id: string) => requests.del(`/photos/${id}`),
	update: (profile: Partial<Profile>) => requests.put("/profiles", profile),
	toggleFollowing: (userName: string) => requests.post(`/follow/${userName}`, {}),
	listFollowings: (userName: string, predicate: string) => requests.get<Profile[]>(`/follow/${userName}?predicate=${predicate}`),
	listUserActivities: (userName: string, predicate: string | undefined) => requests.get<Partial<IActivity>[]>(`/profiles/${userName}/activities?predicate=${predicate}`),
};

const agent = {
    Activities,
    Account,
    Profiles
}

export default agent;