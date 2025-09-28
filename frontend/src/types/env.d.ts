// src/types/env.d.ts
export {};

declare global {
    interface Window {
        __ENV__?: {
            // use VITE_* to match your code below
            VITE_API_DOMAIN?: string;
            VITE_LOGTO_APP_ID?: string;
            VITE_LOGTO_DOMAIN?: string;
            VITE_WEB_DOMAIN?: string;
        };
    }
}