import { Organization, OrganizationScope } from "../organization/types";

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
  family_name: string;
  given_name: string;
  middle_name: string;
  nickname: string;
  preferred_username: string;
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
  primary_email: string;
  primary_phone: string;
  name: string;
  picture: string;
  identities: Identities;
  last_sign_in_at: number; // ms since epoch
  created_at: number; // ms since epoch
  updated_at: number; // ms since epoch
  custom_data: CustomData;
  profile: UserProfile;
  organization_data: OrganizationScope[];
  organizations: Organization[];
  application_id: string;
  is_suspended: true;
  has_password: true;
  sso_identities: SsoIdentity;
}>;
