import { useLogto } from '@logto/react';
import { useState, useCallback } from 'react';
import type { OrganizationData } from '~/types/organization';

import { useResourceApi } from '~/api/resource';

export function useOrganizations() {
  const { fetchUserInfo } = useLogto();
  const { createOrganization, getOrganizations } = useResourceApi();
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrganizations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const orgs = await getOrganizations();
      setOrganizations(orgs);
    } catch (err) {
      setError('Failed to load organizations');
      console.error('Error loading organizations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getOrganizations]);

  const createNewOrganization = useCallback(
    async (name: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const newOrg = await createOrganization({ name });
        setOrganizations((prev) => [...prev, newOrg]);
        return newOrg;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create organization';
        setError(message);
        console.error('Error creating organization:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [createOrganization],
  );

  return {
    organizations,
    isLoading,
    error,
    loadOrganizations,
    createOrganization: createNewOrganization,
  };
}
