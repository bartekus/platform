export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "unpaid";

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  priceId: string;
  currentPeriodEnd: number; // ms since epoch
}

export type CustomData = Partial<{
  stripeCustomerId: string;
  subscription: Subscription;
}>;

export interface IdentityDetails {
  id: string;
  name: string;
  email: string;
  avatar: string;
  rawData: Record<string, unknown>;
}

export interface ProviderIdentity {
  userId: string;
  details: IdentityDetails;
}

/** Map like { google: ProviderIdentity } */
export type Identities = Record<string, ProviderIdentity>;

export interface SsoIdentity {
  tenantId: string;
  id: string;
  userId: string;
  issuer: string;
  identityId: string;
  detail: Record<string, unknown>; // flexible payload from provider
  createdAt: number; // ms since epoch
  updatedAt: number; // ms since epoch
  ssoConnectorId: string;
}

export type UserProfile = Partial<{
  familyName: string;
  givenName: string;
  middleName: string;
  nickname: string;
  preferredUsername: string;
  profile: string;
  website: string;
  gender: string;
  birthdate: string;
  zoneinfo: string;
  locale: string;
  address: Partial<{
    formatted: string;
    streetAddress: string;
    locality: string;
    region: string;
    postalCode: string;
    country: string;
  }>;
}>;

export type User = Partial<{
  id: string;
  username: string;
  primaryEmail: string;
  primaryPhone: string;
  name: string;
  picture: string;
  identities: Identities;
  lastSignInAt: number; // ms since epoch
  createdAt: number; // ms since epoch
  updatedAt: number; // ms since epoch
  customData: CustomData;
  profile: UserProfile;
  applicationId: string;
  isSuspended: true;
  hasPassword: true;
  ssoIdentities: SsoIdentity;
}>;
