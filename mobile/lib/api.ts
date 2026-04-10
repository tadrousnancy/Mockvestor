// a small API helper for protected routes
import { API_BASE_URL } from "../config";
import { getAccessToken } from "./auth";

export async function apiFetch(
    path: string,
    options: RequestInit = {},
    requireAuth: boolean = false
) {
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");

    if (requireAuth) {
        const token = await getAccessToken();
        if (!token) {
            throw new Error("No access token found. Please log in again.");
        }
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    });

    let data: any = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        throw new Error(data?.detail || data?.message || "Request failed");
    }

    return data;
}

//this is what attaches the JWT for /portfolio, /deposit, /orders, etc., which backend requires
