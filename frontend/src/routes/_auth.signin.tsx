import { LogIn } from "lucide-react";
import { useLogto } from "@logto/react";
import { Button } from "~/components/ui/button";
import { /*redirect,*/ createFileRoute } from "@tanstack/react-router";

import { authConfig } from "~/config/logto";
// import { z } from "zod";

const { signInRedirectUri } = authConfig;

export const Route = createFileRoute("/_auth/signin")({
  // validateSearch: z.object({
  //   redirect: z.string().optional().catch(""),
  // }),
  // beforeLoad: async ({ context, search }) => {
  //   const { isAuthenticated } = await useLogto();
  //
  //   if (isAuthenticated) {
  //     throw redirect({ to: signInRedirectUri });
  //   }
  // },
  component: SignInPage,
});

function SignInPage() {
  const { signIn } = useLogto();

  const search = Route.useSearch();

  const handleSignIn = () => {
    signIn(`${signInRedirectUri}`);
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-md mx-auto p-8 border rounded-2xl gradient-card shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          {search.redirect ? (
            <p className="text-red-500">You need to login to access this page.</p>
          ) : (
            <p className="text-muted-foreground">Sign in to continue to your account</p>
          )}
        </div>

        <Button variant="accent" size="lg" className="w-full" onClick={handleSignIn}>
          <LogIn className="mr-2 h-5 w-5" />
          Continue with Logto
        </Button>

        <p className="text-sm text-muted-foreground text-center mt-6">Don't have an account? You'll create one during sign-in.</p>
      </div>
    </div>
  );
}
