import { LogtoConfig } from '@logto/react'

console.log('import.meta.env');
console.log(import.meta.env)

console.log('window?.__ENV__');
console.log(window?.__ENV__)

const API_DOMAIN = import.meta.env?.VITE_API_DOMAIN || window?.__ENV__?.VITE_API_DOMAIN;
const LOGTO_APP_ID = import.meta.env?.VITE_LOGTO_APP_ID || window?.__ENV__?.VITE_LOGTO_APP_ID;
const LOGTO_DOMAIN = import.meta.env?.VITE_LOGTO_DOMAIN || window?.__ENV__?.VITE_LOGTO_DOMAIN;
const WEB_DOMAIN = import.meta.env?.VITE_WEB_DOMAIN || window?.__ENV__?.VITE_WEB_DOMAIN;

if (!API_DOMAIN) {
    throw new Error("You must specify a valid VITE_API_DOMAIN.");
}

if (!LOGTO_APP_ID) {
    throw new Error("You must specify a valid VITE_LOGTO_APP_ID.");
}

if (!LOGTO_DOMAIN) {
    throw new Error("You must specify a valid VITE_LOGTO_DOMAIN.");
}

if (!WEB_DOMAIN) {
    throw new Error("You must specify a valid VITE_WEB_DOMAIN.");
}

export const config: LogtoConfig = {
    // The public Logto endpoint (core)
    endpoint: `https://${LOGTO_DOMAIN}`,

    // The application ID you created in Logto admin for your frontend
    appId: `${LOGTO_APP_ID}`,   // comes from Logto Admin UI

    // Match the API resource you registered in Logto for Encore
    resources: [`https://${API_DOMAIN}/api`],
}

export const appConfig = {
    // Same API resource as above, just reused by your frontend code
    apiResourceIndicator: `https://${API_DOMAIN}/api`,

    // Where Logto should send the browser back after sign-in
    // Must match the redirect URI registered in your Logto app config
    signInRedirectUri: `https://${WEB_DOMAIN}/callback`,

    // Where to go after sign-out; also should be registered in Logto
    signOutRedirectUri: `https://${WEB_DOMAIN}/`,
}

// Encore server proxied through Traefik
export const encoreApiEndpoint = `https://${API_DOMAIN}`