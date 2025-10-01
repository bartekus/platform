import { APICallMeta } from 'encore.dev';
import { Service } from 'encore.dev/service';
import { APIError, middleware } from 'encore.dev/api';

import { getAuthData, type AuthData } from '~encore/auth';

export const hasRequiredScopes = (tokenScopes: Iterable<unknown> | null | undefined, requiredScopes: any[]) => {
  if (!requiredScopes || requiredScopes.length === 0) {
    return true;
  }
  const scopeSet = new Set(tokenScopes);
  return requiredScopes.every((scope) => scopeSet.has(scope));
};

// Authorization middleware that only allows users role based access to the workspaces API
const requireOrganizationAccess = middleware({ target: { auth: true } }, async (req, next) => {
  const auth = getAuthData() as NonNullable<AuthData>;
  const apiCallMeta = req.requestMeta as APICallMeta;

  console.log('auth', auth);

  // check if GET request has "read:resources" scope
  if (apiCallMeta.method === 'GET') {
    // Verify required scopes
    if (!hasRequiredScopes(auth.scopes, ['read:resources'])) {
      throw APIError.permissionDenied(`Insufficient permissions: Missing 'read:resources' scope`);
    } else {
      console.log('Authorized GET Workspace call');
    }
  }

  if (apiCallMeta.method === 'POST') {
    // Verify required scopes
    if (!hasRequiredScopes(auth.scopes, ['create:resources'])) {
      throw APIError.permissionDenied(`Insufficient permissions: Missing 'create:resources' scope`);
    } else {
      console.log('Authorized POST Workspace call');
    }
  }

  if (apiCallMeta.method === 'PUT') {
    // Verify required scopes
    if (!hasRequiredScopes(auth.scopes, ['edit:resources'])) {
      throw APIError.permissionDenied(`Insufficient permissions: Missing 'edit:resources' scope`);
    } else {
      console.log('Authorized PUT Workspace call');
    }
  }

  if (apiCallMeta.method === 'DELETE') {
    // Verify required scopes
    if (!hasRequiredScopes(auth.scopes, ['delete:resources'])) {
      throw APIError.permissionDenied(`Insufficient permissions: Missing 'delete:resources' scope`);
    } else {
      console.log('Authorized DELETE Workspace call');
    }
  }

  return await next(req);
});

// Encore will consider this directory and all its subdirectories as part of the "workspaces" service.
// https://encore.dev/docs/ts/primitives/services
export default new Service('workspace', {
  middlewares: [requireOrganizationAccess],
});
