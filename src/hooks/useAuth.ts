import { useCallback } from "react";
import { useAuthStore } from "../stores/authStore";
import { TURNSTILE_LOGIN_SITE_KEY } from "../utils/turnstile";

export function useAuth() {
    const {
        isAuthenticated,
        isLoading,
        user,
        login,
        register,
        logout,
        initialize,
        setCfClearance,
        turnstileToken,
        setTurnstileToken,
    } = useAuthStore();

    const loginWithCaptcha = useCallback(
        async (email: string, password: string) => {
            const token = useAuthStore.getState().turnstileToken;
            if (!token) {
                throw new Error("Captcha verification required");
            }
            await login(email, password, token);
            setTurnstileToken("");
        },
        [login, setTurnstileToken],
    );

    const registerWithCaptcha = useCallback(
        async (email: string, password: string) => {
            const token = useAuthStore.getState().turnstileToken;
            if (!token) {
                throw new Error("Captcha verification required");
            }
            await register(email, password, token);
            setTurnstileToken("");
        },
        [register, setTurnstileToken],
    );

    return {
        isAuthenticated,
        isLoading,
        user,
        login: loginWithCaptcha,
        register: registerWithCaptcha,
        logout,
        initialize,
        setCfClearance,
        turnstileToken,
        setTurnstileToken,
        turnstileSiteKey: TURNSTILE_LOGIN_SITE_KEY,
    };
}
