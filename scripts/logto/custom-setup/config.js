import { customAlphabet } from 'nanoid';
import { defaultTenantId } from '@logto/schemas';
// import { Connectors } from '@logto/schemas';

// For IDs (20 chars, lowercase alphanumeric)
const generateId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 20);

// For shorter IDs (12 chars, lowercase alphanumeric)
// const generateShortId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

// For secrets (32 chars, mixed case alphanumeric)
// const generateSecret = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 32);

// const id = generateId();       // e.g. "n97ofytecm4prbef76lnz"
// const shortId = generateShortId(); // e.g. "j0ui1959vbv9"
// const secret = generateSecret(); // e.g. "PGWiNZdfMvc24XlA8Dk1oAMwNpb4PrrW"

function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  // Get microseconds (JS only provides milliseconds, so pad with extra digits)
  const microseconds = String(date.getUTCMilliseconds()).padStart(3, '0') + '000';

  // Combine all parts
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${microseconds}+00`;
}

const now = new Date();

// console.log(' ');
// console.log('process.env:', process.env);
// console.log(' ');

const TENANT_ID = defaultTenantId || 'default';
console.log(' ');
console.log('TENANT_ID:', TENANT_ID);
console.log(' ');

const ROLE_M2M_ID = generateId();
const ORGANIZATION_ROLE_ID_ADMIN = generateId();
const ORGANIZATION_ROLE_ID_EDITOR = generateId();
const ORGANIZATION_ROLE_ID_MEMBER = generateId();

const ORGANIZATION_SCOPE_RESOURCE_CREATE_ID = generateId();
const ORGANIZATION_SCOPE_RESOURCE_READ_ID = generateId();
const ORGANIZATION_SCOPE_RESOURCE_EDIT_ID = generateId();
const ORGANIZATION_SCOPE_RESOURCE_DELETE_ID = generateId();

export const config = {
  applications: [
    {
      tenantId: TENANT_ID,
      id: `${process.env.LOGTO_MANAGEMENT_API_APPLICATION_ID}`,
      name: `${process.env.APP_NAME} hub`,
      secret: `${process.env.LOGTO_MANAGEMENT_API_APPLICATION_SECRET}`,
      description: `${process.env.APP_NAME} m2m`,
      type: 'MachineToMachine',
      oidcClientMetadata: {
        redirectUris: [],
        postLogoutRedirectUris: [],
      },
      customClientMetadata: {},
      protectedAppMetadata: null,
      isThirdParty: false,
      createdAt: formatDate(now),
    },
    {
      tenantId: TENANT_ID,
      id: `${process.env.LOGTO_APP_ID}`,
      name: `${process.env.APP_NAME}`,
      secret: `${process.env.LOGTO_APP_SECRET}`,
      description: `${process.env.APP_DESCRIPTION}`,
      type: 'SPA',
      oidcClientMetadata: {
        redirectUris: [`https://${process.env.APP_URI}/callback`, `https://${process.env.APP_URI}`, `${process.env.APP_URL}/callback`, `${process.env.APP_URL}`],
        postLogoutRedirectUris: [`https://${process.env.APP_URI}`, `${process.env.APP_URL}`],
      },
      customClientMetadata: {
        idTokenTtl: 3600,
        corsAllowedOrigins: [],
        rotateRefreshToken: true,
        refreshTokenTtlInDays: 7,
        alwaysIssueRefreshToken: false,
      },
      protectedAppMetadata: null,
      isThirdParty: false,
      createdAt: formatDate(now),
    },
  ],

  connectors: [
    // {
    //   tenantId: TENANT_ID,
    //   id: `${process.env.CONNECTOR_ID_GOOGLE}`,
    //   connectorId: 'google-universal',
    //   config: {
    //     scope: 'openid profile email',
    //     clientId: `${process.env.LOGTO_GOOGLE_CLIENT_ID}`,
    //     clientSecret: `${process.env.LOGTO_GOOGLE_CLIENT_SECRET}`
    //   },
    //   syncProfile: false,
    //   metadata: {},
    //   createdAt: formatDate(now),
    // }
  ],

  sso_connectors: [
    // {
    //   tenantId: TENANT_ID,
    //   id: `${process.env.SSO_CONNECTOR_ID_GOOGLE}`,
    //   provider_name: 'GoogleWorkspace',
    //   connector_name: `${process.env.APP_NAME} google workspace connector`,
    //   config: {
    //     scope: 'openid profile email',
    //     clientId: `${process.env.LOGTO_GOOGLE_WORKSPACE_CLIENT_ID}`,
    //     clientSecret: `${process.env.LOGTO_GOOGLE_WORKSPACE_CLIENT_SECRET}`,
    //   },
    //   domains: JSON.parse(process.env.SSO_CONNECTOR_APPROVED_DOMAINS || '[]'),
    //   branding: {
    //     displayName: `${process.env.APP_NAME} workspace`,
    //   },
    //   sync_profile: false,
    //   created_at: formatDate(now),
    // },
  ],

  sign_in_experiences: [
    {
      tenantId: TENANT_ID,
      id: 'default',
      color: {
        primaryColor: '#0053db',
        darkPrimaryColor: '#0072f0',
        isDarkModeEnabled: true,
      },
      branding: {
        logoUrl: `${process.env.APP_URL}/logo.png`,
        darkLogoUrl: `${process.env.APP_URL}/logo-dark.png`,
      },
      language_info: {
        autoDetect: true,
        fallbackLanguage: 'en',
      },
      terms_of_use_url: `${process.env.APP_URL}/terms-of-service.html`,
      privacy_policy_url: `${process.env.APP_URL}/privacy-policy.html`,
      sign_in: {
        methods: [],
      },
      sign_up: {
        verify: false,
        password: true, // false if using social_sign_in_connector_targets
        identifiers: [],
      },
      social_sign_in_connector_targets: [""], // social_sign_in_connector_targets: ["google"], if using google connector
      sign_in_mode: 'SignInAndRegister',
      custom_css: `[aria-label*="Logto"] { display: none; }`,
      custom_content: {},
      password_policy: {
        length: {
          max: 256,
          min: 8,
        },
        rejects: {
          pwned: true,
          words: [],
          userInfo: true,
          repetitionAndSequence: true,
        },
        characterTypes: {
          min: 1,
        },
      },
      mfa: {
        policy: 'UserControlled',
        factors: [],
      },
      single_sign_on_enabled: true,
    },
  ],
  roles: [
    {
      tenantId: TENANT_ID,
      id: ROLE_M2M_ID,
      name: 'Management API Access',
      description: 'Role with management API access scope.',
      type: 'MachineToMachine',
    }
  ],


  applications_roles: [
    {
      tenantId: TENANT_ID,
      id: generateId(),
      application_id: `${process.env.LOGTO_MANAGEMENT_API_APPLICATION_ID}`,
      role_id: ROLE_M2M_ID,
    },
  ],

  roles_scopes: [
    {
      tenantId: TENANT_ID,
      id: generateId(),
      role_id: ROLE_M2M_ID,
      scope_id: 'management-api-all',
    },
  ],
  resources: [
    {
      tenantId: TENANT_ID,
      id: generateId(),
      name: `${process.env.APP_NAME} api resource identifier`,
      indicator: `${process.env.LOGTO_APP_API_RESOURCE}`,
      is_default: false,
      access_token_ttl: 3600,
    },
  ],

  scopes: [],

  organizations: [],

  organization_roles: [
    {
      tenantId: TENANT_ID,
      id: ORGANIZATION_ROLE_ID_ADMIN,
      name: 'admin',
      description: 'Admin Role',
    },
    {
      tenantId: TENANT_ID,
      id: ORGANIZATION_ROLE_ID_EDITOR,
      name: 'editor',
      description: 'Editor Role',
    },
    {
      tenantId: TENANT_ID,
      id: ORGANIZATION_ROLE_ID_MEMBER,
      name: 'member',
      description: 'Member Role',
    },
  ],

  organization_scopes: [
    {
      tenantId: TENANT_ID,
      id: ORGANIZATION_SCOPE_RESOURCE_CREATE_ID,
      name: 'create:resources',
      description: 'Create Resources',
    },
    {
      tenantId: TENANT_ID,
      id: ORGANIZATION_SCOPE_RESOURCE_READ_ID,
      name: 'read:resources',
      description: 'Read Resources',
    },
    {
      tenantId: TENANT_ID,
      id: ORGANIZATION_SCOPE_RESOURCE_EDIT_ID,
      name: 'edit:resources',
      description: 'Edit Resources',
    },
    {
      tenantId: TENANT_ID,
      id: ORGANIZATION_SCOPE_RESOURCE_DELETE_ID,
      name: 'delete:resources',
      description: 'Delete Resources',
    },
  ],

  organization_role_scope_relations: [
    {
      tenantId: TENANT_ID,
      organization_role_id: ORGANIZATION_ROLE_ID_ADMIN,
      organization_scope_id: ORGANIZATION_SCOPE_RESOURCE_CREATE_ID,
    },
    {
      tenantId: TENANT_ID,
      organization_role_id: ORGANIZATION_ROLE_ID_ADMIN,
      organization_scope_id: ORGANIZATION_SCOPE_RESOURCE_READ_ID,
    },
    {
      tenantId: TENANT_ID,
      organization_role_id: ORGANIZATION_ROLE_ID_ADMIN,
      organization_scope_id: ORGANIZATION_SCOPE_RESOURCE_EDIT_ID,
    },
    {
      tenantId: TENANT_ID,
      organization_role_id: ORGANIZATION_ROLE_ID_ADMIN,
      organization_scope_id: ORGANIZATION_SCOPE_RESOURCE_DELETE_ID,
    },
    {
      tenantId: TENANT_ID,
      organization_role_id: ORGANIZATION_ROLE_ID_EDITOR,
      organization_scope_id: ORGANIZATION_SCOPE_RESOURCE_CREATE_ID,
    },
    {
      tenantId: TENANT_ID,
      organization_role_id: ORGANIZATION_ROLE_ID_EDITOR,
      organization_scope_id: ORGANIZATION_SCOPE_RESOURCE_READ_ID,
    },
    {
      tenantId: TENANT_ID,
      organization_role_id: ORGANIZATION_ROLE_ID_EDITOR,
      organization_scope_id: ORGANIZATION_SCOPE_RESOURCE_EDIT_ID,
    },
    {
      tenantId: TENANT_ID,
      organization_role_id: ORGANIZATION_ROLE_ID_MEMBER,
      organization_scope_id: ORGANIZATION_SCOPE_RESOURCE_READ_ID,
    },
  ],

  webhooks: [
    {
      tenantId: TENANT_ID,
      id: generateId(),
      name: 'On New User Create',
      events: ['PostRegister'],
      signingKey: `${process.env.LOGTO_APP_API_EVENT_WEBHOOK_SIGNING_KEY}`,
      config: {
        url: `${process.env.LOGTO_APP_API_EVENT_WEBHOOK_URL}`,
      },
      enabled: true,
      createdAt: formatDate(now),
    }
  ],
};
