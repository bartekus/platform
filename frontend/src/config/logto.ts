import { LogtoConfig } from '@logto/react'

export const config: LogtoConfig = {
    // The public Logto endpoint (core)
    endpoint: 'https://logto.localdev.online',

    // The application ID you created in Logto admin for your frontend
    appId: 'q33loirfmp83n55u4l8k',   // comes from Logto Admin UI

    // Match the API resource you registered in Logto for Encore
    resources: ['https://backend.localdev.online/api'],
}

export const appConfig = {
    // Same API resource as above, just reused by your frontend code
    apiResourceIndicator: 'https://backend.localdev.online/api',

    // Where Logto should send the browser back after sign-in
    // Must match the redirect URI registered in your Logto app config
    signInRedirectUri: 'https://web.localdev.online/callback',

    // Where to go after sign-out; also should be registered in Logto
    signOutRedirectUri: 'https://web.localdev.online/',
}

// Encore dev server proxied through Traefik
export const encoreApiEndpoint = 'https://backend.localdev.online'