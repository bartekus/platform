import { createFileRoute } from '@tanstack/react-router';
import { useLogto } from '@logto/react';
import { Button } from '../components/ui/button';
import { LogIn } from 'lucide-react';

export const Route = (createFileRoute as any)('/signin')({
  component: SignInPage,
});

function SignInPage() {
  const { signIn } = useLogto();

  const handleSignIn = () => {
    signIn(`${window.location.origin}/callback`);
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-md mx-auto p-8 border rounded-2xl gradient-card shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to continue to your account</p>
        </div>

        <Button variant="accent" size="lg" className="w-full" onClick={handleSignIn}>
          <LogIn className="mr-2 h-5 w-5" />
          Continue with Logto
        </Button>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Don't have an account? You'll create one during sign-in.
        </p>
      </div>
    </div>
  );
}
