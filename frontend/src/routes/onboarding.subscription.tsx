import { useLogto } from "@logto/react";
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "~/lib/session";

import getRequestClient from "~/lib/get-request-client";
import { useSubscriptionApi } from "~/api/subsciption";
import { fallbackToRoot } from "~/config/constants";
import PlanCard from "~/components/PlanCard";
import { authConfig } from "~/config/logto";
import { stripe } from "~/lib/client";
import { sleep } from "~/lib/utils";

import type { UserCustomData } from "~/types";

export const Route = createFileRoute("/onboarding/subscription")({
  beforeLoad: requireAuth,
  component: SubscriptionPage,
});

const { onboardingVerifyUri, onboardingSubscriptionUri } = authConfig;

function SubscriptionPage() {
  const navigate = Route.useNavigate();
  const { getAccessToken, fetchUserInfo } = useLogto();
  const { createUserSubscription } = useSubscriptionApi();
  const [plans, setPlans] = useState<stripe.StripeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const token = await getAccessToken(authConfig.apiResourceIndicator);
        if (!token) {
          console.error("No access token available");
          return;
        }

        const client = getRequestClient(token);
        const response = await client.stripe.listPlans({ active: true });

        if (response.success && response.result) {
          setPlans(response.result);
        }
      } catch (error) {
        console.error("Error in loadPlans:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, [getAccessToken]);

  const handleSubscribe = async (priceId: string) => {
    const maxRetries = 3; // Maximum number of retries for Stripe customer ID
    let retryCount = 0;

    const attemptSubscription = async (): Promise<void> => {
      try {
        const userInfo = await fetchUserInfo();
        const customData = userInfo?.custom_data as UserCustomData;

        console.log(`Checking for Stripe customer ID (attempt ${retryCount + 1}/${maxRetries}):`, customData);

        if (!customData?.stripeCustomerId) {
          if (retryCount < maxRetries - 1) {
            // No Stripe customer ID yet, retry
            console.log(`No Stripe customer ID found, retrying... (${retryCount + 1}/${maxRetries})`);
            retryCount++;
            
            // Wait for webhook to process customer creation
            await sleep(2000 + (retryCount * 1000)); // 2s, 3s, 4s
            return attemptSubscription();
          } else {
            // Max retries reached
            console.error("Max retries reached - no Stripe customer ID found");
            await navigate({ to: fallbackToRoot });
            return;
          }
        }

        // Stripe customer ID found, proceed with subscription
        console.log("Stripe customer ID found:", customData.stripeCustomerId);

        const session = await createUserSubscription({
          priceId,
          customerId: customData.stripeCustomerId,
          successUrl: `${onboardingVerifyUri}`,
          cancelUrl: `${onboardingSubscriptionUri}`,
        });

        if (session.success && session.result?.url) {
          console.log("session success", session);
          window.location.href = session.result.url;
          return;
        } else if (session.error && session.result?.url) {
          console.log("session error", session);
          window.location.href = session.result.url;
          return;
        }
      } catch (error) {
        console.error("Subscription error:", error);
        throw error;
      }
    };

    try {
      await attemptSubscription();
    } catch (error) {
      console.error("Failed to create subscription after retries:", error);
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
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose your plan</h1>

        {/* Billing interval toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 rounded-lg p-1">
            <button
              className={`px-4 py-2 rounded-md ${billingInterval === "month" ? "bg-white shadow-sm" : "text-gray-500"}`}
              onClick={() => setBillingInterval("month")}
            >
              Monthly
            </button>
            <button
              className={`px-4 py-2 rounded-md ${billingInterval === "year" ? "bg-white shadow-sm" : "text-gray-500"}`}
              onClick={() => setBillingInterval("year")}
            >
              Annually
            </button>
          </div>
        </div>

        <p className="text-xl text-muted-foreground">Start with a plan that fits your needs. Upgrade anytime.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const price = getPriceForInterval(plan);

          return (
            <PlanCard
              key={plan.id}
              name={plan.name}
              description={plan.description}
              billingInterval={billingInterval}
              price={price}
              features={plan.metadata && Object.entries(plan.metadata).map(([k, v]) => `${v} ${k}`)}
              onSelect={() => price && handleSubscribe(price.id)}
            />
          );
        })}
      </div>
    </div>
  );
}