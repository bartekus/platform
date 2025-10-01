import { useEffect, useState } from 'react';
import { useLogto } from '@logto/react';
import { Outlet, useNavigate } from 'react-router';

interface UserSubscription {
  id: string;
  status: string;
  priceId: string;
  currentPeriodEnd: number;
}

interface UserCustomData {
  subscription?: UserSubscription;
  stripeCustomerId?: string;
}

export function SubscriptionGuard() {
  const navigate = useNavigate();
  const { isAuthenticated, fetchUserInfo } = useLogto();
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!isAuthenticated) {
        // window.location.href = '/';
        return;
      }

      try {
        const userInfo = await fetchUserInfo();
        const customData = userInfo.custom_data as UserCustomData;

        // Check if user has an active subscription in custom_data
        const hasActiveSubscription = customData?.subscription?.status === 'active';
        setHasSubscription(hasActiveSubscription);

        console.log('hasActiveSubscription', hasActiveSubscription);

        if (!hasActiveSubscription) {
          navigate('/subscription/subscribe');
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setHasSubscription(false);
        // window.location.href = '/';
      }
    };

    checkSubscription();
  }, [isAuthenticated, fetchUserInfo]);

  if (!isAuthenticated || hasSubscription === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return <Outlet />;
}
