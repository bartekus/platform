import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/lib/guards';
import PlanCard from '@/components/PlanCard';
import getRequestClient from '@/lib/get-request-client';

export const Route = (createFileRoute as any)('/onboarding/subscription')({
  beforeLoad: requireAuth,
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const startCheckout = async (planId: string) => {
    const api = getRequestClient();
    const { checkoutUrl } = await api.billing.createCheckoutSession({
      planId,
      returnUrl: `${window.location.origin}/onboarding/verify`,
    });
    window.location.href = checkoutUrl;
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose your plan</h1>
        <p className="text-xl text-muted-foreground">
          Start with a plan that fits your needs. Upgrade anytime.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <PlanCard
          name="Starter"
          price="$0"
          features={['1 workspace', 'Basic file uploads', '5 team members', 'Email support']}
          onSelect={() => startCheckout('starter')}
        />
        <PlanCard
          name="Pro"
          price="$20"
          features={[
            'Unlimited workspaces',
            'Advanced RBAC',
            'Unlimited members',
            'Audit logs',
            'Priority support',
          ]}
          onSelect={() => startCheckout('pro')}
        />
      </div>
    </div>
  );
}
