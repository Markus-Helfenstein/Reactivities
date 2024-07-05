import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useStore } from "../stores/store";

export default function RequireAuth() {
    const {userStore: {isLoggedIn}} = useStore();
    const location = useLocation();

    if (!isLoggedIn) {
        // we could pass state={{from: location}} to the login page, so it might redirect back afterwards
        return <Navigate to='/' state={{from: location}} />
    }

    return <Outlet />
}