import { useEffect, useState } from 'react';
import { useLogto } from '@logto/react';

import getRequestClient from '~/libs/get-request-client';
import { useAuthApi } from '~/api/auth';
import { stripe } from '~/libs/client';
import { appConfig } from '~/config/logto';

export function Subscribe() {
  const { getAccessToken, fetchUserInfo } = useLogto();
  const { createUserSubscription } = useAuthApi();
  const [plans, setPlans] = useState<stripe.StripeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const token = await getAccessToken(appConfig.apiResourceIndicator);
        if (!token) {
          console.error('No access token available');
          return;
        }

        const client = getRequestClient(token);
        const response = await client.stripe.listPlans({ active: true });

        if (response.success && response.result) {
          setPlans(response.result);
        }
      } catch (error) {
        console.error('Error in loadPlans:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, [getAccessToken]);

  const handleSubscribe = async (priceId: string) => {
    try {
      const userInfo = await fetchUserInfo();

      console.log('userInfo', userInfo);

      if (!userInfo?.custom_data?.stripeCustomerId) {
        console.error('No Stripe customer ID found');
        return;
      }

      const session = await createUserSubscription({
        priceId,
        customerId: userInfo.custom_data.stripeCustomerId,
      });

      if (session.success && session.result?.url) {
        window.location.href = session.result.url;
      }
    } catch (error) {
      console.error('Subscription error:', error);
    }
  };

  const getPriceForInterval = (plan: stripe.StripeProduct & { planPricing?: any }) => {
    const prices = plan.planPricing || [];
    return prices.find((price: { recurring: { interval: string } }) => price.recurring?.interval === billingInterval);
  };

  if (loading) {
    return <div>Loading plans...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Choose your plan</h1>

      {/* Billing interval toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 rounded-lg p-1">
          <button
            className={`px-4 py-2 rounded-md ${billingInterval === 'month' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
            onClick={() => setBillingInterval('month')}
          >
            Monthly
          </button>
          <button
            className={`px-4 py-2 rounded-md ${billingInterval === 'year' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
            onClick={() => setBillingInterval('year')}
          >
            Annually
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const price = getPriceForInterval(plan);

          return (
            <div key={plan.id} className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="text-gray-600 mt-2">{plan.description}</p>
              {price && (
                <div className="mt-4">
                  <p className="text-2xl font-bold">
                    ${price.unitAmount ? price.unitAmount / 100 : 0}
                    <span className="text-base font-normal text-gray-600">/{billingInterval}</span>
                  </p>
                </div>
              )}
              <button
                onClick={() => price && handleSubscribe(price.id)}
                disabled={!price}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Subscribe
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
