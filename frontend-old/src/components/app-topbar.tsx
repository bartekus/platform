import { useLogto } from '@logto/react';
import { Link } from 'react-router';

import { Button } from '~/components/ui/button';
import { appConfig } from '~/config/logto';

export function AppTopbar() {
  const { isAuthenticated, signIn, signOut } = useLogto();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center mx-auto">
        <div className="mr-4 flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="21.17" y1="8" x2="12" y2="8" />
              <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
              <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
            </svg>
            <span className="hidden font-bold sm:inline-block">Platform</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {/*<nav className="flex items-center space-x-6">*/}
          {/*  <NavLink to="/features" className="text-sm font-medium transition-colors hover:text-primary">*/}
          {/*    Features*/}
          {/*  </NavLink>*/}
          {/*  <NavLink to="/pricing" className="text-sm font-medium transition-colors hover:text-primary">*/}
          {/*    Pricing*/}
          {/*  </NavLink>*/}
          {/*  <NavLink to="/about" className="text-sm font-medium transition-colors hover:text-primary">*/}
          {/*    About*/}
          {/*  </NavLink>*/}
          {/*</nav>*/}
          <div className="flex items-center space-x-2">
            {isAuthenticated ? (
              <Button size="sm" onClick={() => signOut(appConfig.signOutRedirectUri)}>
                Sign out
              </Button>
            ) : (
              <Button size="sm" onClick={() => signIn(appConfig.signInRedirectUri)}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
