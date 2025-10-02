import { useCallback } from 'react';
import { useLogto } from '@logto/react';

import getRequestClient from '~/lib/get-request-client';
import { appConfig } from '~/config/logto';

export const useAuthApi = () => {
  const { getAccessToken } = useLogto();

  return {
    createUserSubscription: useCallback(
      async (params: { priceId: string; customerId: string }) => {
        const token = await getAccessToken(appConfig.apiResourceIndicator);
        if (!token) throw new Error('Not authorized');

        const client = getRequestClient(token);

        // Create checkout session with customer ID
        const session = await client.stripe.getSubscriptionUrl({
          priceId: params.priceId,
          customerId: params.customerId,
          successUrl: `${window.location.origin}`,
          cancelUrl: `${window.location.origin}`,
        });

        return session;
      },
      [getAccessToken],
    ),

    verifySubscription: useCallback(
      async (sessionId: string) => {
        const token = await getAccessToken(appConfig.apiResourceIndicator);
        if (!token) throw new Error('Not authorized');

        const client = getRequestClient(token);
        return await client.stripe.verifySubscription({ sessionId });
      },
      [getAccessToken],
    ),
  };
};
