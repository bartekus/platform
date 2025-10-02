import { useLogto } from '@logto/react';
import { useCallback } from 'react';
import { appConfig } from '~/config/logto';

export const useAuth = () => {
  const { 
    getAccessToken, 
    getOrganizationToken, 
    getOrganizationTokenClaims,
    fetchUserInfo,
    isAuthenticated,
    isLoading,
    signIn,
    signOut
  } = useLogto();

  // Get access token for general API calls
  const getAccessTokenForApi = useCallback(async () => {
    return await getAccessToken(appConfig.apiResourceIndicator);
  }, [getAccessToken]);

  // Get organization token for organization-scoped calls
  const getOrganizationTokenForApi = useCallback(async (organizationId: string) => {
    return await getOrganizationToken(organizationId);
  }, [getOrganizationToken]);

  // Get user organization scopes
  const getUserOrganizationScopes = useCallback(async (organizationId: string): Promise<string[]> => {
    const organizationToken = await getOrganizationToken(organizationId);
    
    if (!organizationToken) {
      throw new Error('User is not a member of the organization');
    }

    const tokenClaims = await getOrganizationTokenClaims(organizationId);
    
    // This ensures scope is treated as a string before splitting it, and filter(Boolean) removes any empty strings.
    const scopes = String(tokenClaims?.scope || '')
      .split(' ')
      .filter(Boolean);

    return scopes;
  }, [getOrganizationToken, getOrganizationTokenClaims]);

  // Get Electric SQL auth headers for sync
  const getElectricAuth = useCallback(async (organizationId?: string) => {
    const token = organizationId 
      ? await getOrganizationToken(organizationId)
      : await getAccessToken(appConfig.apiResourceIndicator);
    
    if (!token) {
      throw new Error(organizationId ? 'User is not a member of the organization' : 'Failed to get access token');
    }

    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(organizationId && { 'Organization-Id': organizationId })
      }
    };
  }, [getAccessToken, getOrganizationToken]);

  // Get user info with organization data
  const getUserInfo = useCallback(async () => {
    return await fetchUserInfo();
  }, [fetchUserInfo]);

  return {
    // Logto state
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    
    // Token management
    getAccessToken: getAccessTokenForApi,
    getOrganizationToken: getOrganizationTokenForApi,
    getUserOrganizationScopes,
    
    // Electric SQL integration
    getElectricAuth,
    
    // User info
    getUserInfo,
  };
};
