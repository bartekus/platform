import { createFileRoute } from "@tanstack/react-router";
import { useLogto } from "@logto/react";
import { Button } from "../components/ui/button";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/signout")({
  component: SignOutPage,
});

function SignOutPage() {
  const { signOut } = useLogto();

  const handleSignOut = () => {
    signOut(window.location.origin);
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-md mx-auto p-8 border rounded-2xl gradient-card shadow-lg text-center">
        <h1 className="text-2xl font-semibold mb-4">Sign out</h1>
        <p className="text-muted-foreground mb-6">Are you sure you want to sign out of your account?</p>
        <Button variant="destructive" size="lg" className="w-full" onClick={handleSignOut}>
          <LogOut className="mr-2 h-5 w-5" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
