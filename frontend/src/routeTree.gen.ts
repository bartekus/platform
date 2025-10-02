// Manual route tree configuration
import { rootRoute } from './routes/__root';
import { Route as IndexRoute } from './routes/index';
import { Route as SignoutRoute } from './routes/signout';
import { Route as SigninRoute } from './routes/signin';
import { Route as CallbackRoute } from './routes/callback';
import { Route as OnboardingSubscriptionRoute } from './routes/onboarding.subscription';
import { Route as OnboardingVerifyRoute } from './routes/onboarding.verify';
import { Route as OnboardingProfileRoute } from './routes/onboarding.profile';
import { Route as OnboardingOrganizationRoute } from './routes/onboarding.organization';
import { Route as OrgOrgIdRoute } from './routes/org.$orgId';
import { Route as OrgOrgIdIndexRoute } from './routes/org.$orgId.index';
import { Route as OrgOrgIdWorkspacesRoute } from './routes/org.$orgId.workspaces';
import { Route as OrgOrgIdSettingsRoute } from './routes/org.$orgId.settings';
import { Route as OrgOrgIdMembersRoute } from './routes/org.$orgId.members';
import { Route as OrgOrgIdAdminRoute } from './routes/org.$orgId.admin';

const orgRoutes = OrgOrgIdRoute.addChildren([
  OrgOrgIdIndexRoute,
  OrgOrgIdWorkspacesRoute,
  OrgOrgIdSettingsRoute,
  OrgOrgIdMembersRoute,
  OrgOrgIdAdminRoute,
] as any);

export const routeTree = rootRoute.addChildren([
  IndexRoute,
  SignoutRoute,
  SigninRoute,
  CallbackRoute,
  OnboardingSubscriptionRoute,
  OnboardingVerifyRoute,
  OnboardingProfileRoute,
  OnboardingOrganizationRoute,
  orgRoutes,
] as any);
