import axios from "axios";
import { AUTH_BASE_URL, SUPABASE_ANON_KEY } from "../utils/constants";
import type { LoginRequest, LoginResponse } from "../types/api";
import { getUserAgent } from "../utils/userAgent";

const authAxios = axios.create({
    baseURL: AUTH_BASE_URL,
    headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    timeout: 30000,
});

authAxios.interceptors.request.use((config) => {
    const ua = getUserAgent();
    if (ua) {
        config.headers["User-Agent"] = ua;
    }
    return config;
});

export async function login(data: LoginRequest): Promise<LoginResponse> {
    console.log("[AUTH] login request:", {
        email: data.email,
        grant_type: "password",
        captcha_token_length: data.gotrue_meta_security.captcha_token.length,
    });
    const response = await authAxios.post<LoginResponse>(
        "/auth/v1/token?grant_type=password",
        data,
    );
    console.log(
        "[AUTH] login response status:",
        response.status,
        "has_token:",
        !!response.data.access_token,
    );
    return response.data;
}

export async function register(data: LoginRequest): Promise<LoginResponse> {
    console.log("[AUTH] register request:", {
        email: data.email,
        grant_type: "signup",
        captcha_token_length: data.gotrue_meta_security.captcha_token.length,
    });
    const response = await authAxios.post<LoginResponse>(
        "/auth/v1/token?grant_type=signup",
        data,
    );
    console.log(
        "[AUTH] register response status:",
        response.status,
        "has_token:",
        !!response.data.access_token,
    );
    return response.data;
}

export async function refreshToken(
    refreshTokenStr: string,
): Promise<LoginResponse> {
    const response = await authAxios.post<LoginResponse>(
        "/auth/v1/token?grant_type=refresh_token",
        { refresh_token: refreshTokenStr },
    );
    return response.data;
}
