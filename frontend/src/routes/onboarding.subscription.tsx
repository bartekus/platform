import { useLogto } from "@logto/react";
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
// import { requireAuth } from "~/lib/guards";

import getRequestClient from "~/lib/get-request-client";
import { useSubscriptionApi } from "~/api/subsciption";
import PlanCard from "~/components/PlanCard";
import { appConfig } from "~/config/logto";
import { stripe } from "~/lib/client";

export const Route = createFileRoute("/onboarding/subscription")({
  // beforeLoad: requireAuth,
  component: SubscriptionPage,
});

function SubscriptionPage() {
  // const startCheckout = async (planId: string) => {
  //   const accessToken = await getAccessToken(appConfig.apiResourceIndicator);
  //
  //   const api = getRequestClient();
  //   const { checkoutUrl } = await api.stripe.getSubscriptionUrl({
  //     planId,
  //     returnUrl: `${window.location.origin}/onboarding/verify`,
  //   });
  //   window.location.href = checkoutUrl;
  // };

  const navigate = Route.useNavigate();
  const { getAccessToken, fetchUserInfo } = useLogto();
  const { createUserSubscription } = useSubscriptionApi();
  const [plans, setPlans] = useState<stripe.StripeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const token = await getAccessToken(appConfig.apiResourceIndicator);
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
    try {
      const userInfo = await fetchUserInfo();

      console.log("userInfo", userInfo);

      if (!userInfo?.custom_data?.stripeCustomerId) {
        console.error("No Stripe customer ID found");
        return;
      }

      const session = await createUserSubscription({
        priceId,
        customerId: userInfo.custom_data.stripeCustomerId,
        successUrl: `${window.location.origin}/onboarding/verify`,
        cancelUrl: `${window.location.origin}/onboarding/subscription`,
      });

      console.log("session", session);

      // if (session.success && session.result?.url) {
      //   window.location.href = session.result.url;
      // }
    } catch (error) {
      console.error("Subscription error:", error);
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
