import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useLogto } from '@logto/react';

import { APP_ENV } from '~/env';

export const RequireAuth = () => {
  const { isAuthenticated, isLoading, signIn } = useLogto();

  useEffect(() => {
    if (!isAuthenticated) {
      void signIn(APP_ENV.app.redirectUrl);
    }
  }, [isAuthenticated, isLoading, signIn]);

  return isAuthenticated ? <Outlet /> : <p>Not authenticated</p>;
};
