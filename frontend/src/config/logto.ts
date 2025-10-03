import { LogtoConfig, UserScope, ReservedResource } from "@logto/react";

console.log("import.meta.env");
console.log(import.meta.env);

console.log("window?.__ENV__");
console.log(typeof window !== "undefined" && window?.__ENV__);

const API_DOMAIN = import.meta.env?.VITE_API_DOMAIN || (typeof window !== "undefined" && window?.__ENV__?.VITE_API_DOMAIN);
const LOGTO_APP_ID = import.meta.env?.VITE_LOGTO_APP_ID || (typeof window !== "undefined" && window?.__ENV__?.VITE_LOGTO_APP_ID);
const LOGTO_DOMAIN = import.meta.env?.VITE_LOGTO_DOMAIN || (typeof window !== "undefined" && window?.__ENV__?.VITE_LOGTO_DOMAIN);
const WEB_DOMAIN = import.meta.env?.VITE_WEB_DOMAIN || (typeof window !== "undefined" && window?.__ENV__?.VITE_WEB_DOMAIN);

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
  endpoint: `https://${LOGTO_DOMAIN}`,
  appId: `${LOGTO_APP_ID}`,
  resources: [ReservedResource.Organization, `https://${API_DOMAIN}/api`],
  scopes: [
    UserScope.Email, // For `{POST,DELETE} /api/my-account/primary-email` APIs
    UserScope.Phone, // For `{POST,DELETE} /api/my-account/primary-phone` APIs
    UserScope.CustomData, // To manage custom data
    UserScope.Address, // To manage address
    UserScope.Identities, // For identity and MFA related APIs
    UserScope.Profile, // To manage user profile
    UserScope.Organizations,
    "create:organization",
    "create:resources",
    "read:resources",
    "edit:resources",
    "delete:resources",
  ],
};

export const appConfig = {
  apiResourceIndicator: `https://${API_DOMAIN}/api`,
  signInRedirectUri: `https://${WEB_DOMAIN}/callback`,
  signOutRedirectUri: `https://${WEB_DOMAIN}/`,
};

export const encoreApiEndpoint = `https://${API_DOMAIN}`;
