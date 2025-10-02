import { LogtoConfig, UserScope, ReservedResource } from '@logto/react';

console.log('import.meta.env');
console.log(import.meta.env);

console.log('window?.__ENV__');
// @ts-ignore
console.log(window?.__ENV__);

// @ts-ignore
const API_DOMAIN = import.meta.env?.VITE_API_DOMAIN || window?.__ENV__?.VITE_API_DOMAIN;
// @ts-ignore
const LOGTO_APP_ID = import.meta.env?.VITE_LOGTO_APP_ID || window?.__ENV__?.VITE_LOGTO_APP_ID;
// @ts-ignore
const LOGTO_DOMAIN = import.meta.env?.VITE_LOGTO_DOMAIN || window?.__ENV__?.VITE_LOGTO_DOMAIN;
// @ts-ignore
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
  endpoint: `https://${LOGTO_DOMAIN}`,
  appId: `${LOGTO_APP_ID}`,
  resources: [ReservedResource.Organization, `https://${API_DOMAIN}/api`],
  scopes: [
    UserScope.CustomData,
    UserScope.Organizations,
    'create:organization',
    'create:resources',
    'read:resources',
    'edit:resources',
    'delete:resources',
  ],
};

export const appConfig = {
  apiResourceIndicator: `https://${API_DOMAIN}/api`,
  signInRedirectUri: `https://${WEB_DOMAIN}/callback`,
  signOutRedirectUri: `https://${WEB_DOMAIN}/`,
};

export const encoreApiEndpoint = `https://${API_DOMAIN}`;
