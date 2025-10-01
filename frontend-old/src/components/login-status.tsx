import { useLogto, type UserInfoResponse } from '@logto/react';
import { useEffect, useState } from 'react';

/**
 * Component displaying login/logout button and basic user information if logged in.
 */
function LoginStatus() {
  const { signIn, isAuthenticated, isLoading, fetchUserInfo, signOut } = useLogto();
  const [user, setUser] = useState<UserInfoResponse>();

  useEffect(() => {
    (async () => {
      if (isAuthenticated) {
        const userInfo = await fetchUserInfo();
        setUser(userInfo);
      }
    })();
  }, [fetchUserInfo, isAuthenticated]);

  if (isLoading) return null;

  return isAuthenticated ? (
    <div className="authStatus">
      {user && user?.picture && user?.name ? <img src={user?.picture} alt={user?.name} /> : null}
      <button onClick={() => signOut(window.location.origin)}>Sign out {user?.email}</button>
    </div>
  ) : (
    <button onClick={() => signIn(`${window.location.origin}/callback`)}>Sign in</button>
  );
}

export default LoginStatus;
