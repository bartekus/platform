import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
// import { requireActiveSub } from "~/lib/guards";
import getRequestClient from "~/lib/get-request-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export const Route = createFileRoute("/onboarding/profile")({
  // beforeLoad: requireActiveSub,
  component: ProfilePage,
});

function ProfilePage() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
      await getRequestClient().me.updateProfile(payload as any);
      window.location.replace("/onboarding/organization");
    } catch (error) {
      console.error("Profile update error:", error);
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Complete your profile</h1>
          <p className="text-muted-foreground">Tell us a bit about yourself</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" name="displayName" placeholder="John Doe" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeZone">Time Zone</Label>
            <Input id="timeZone" name="timeZone" placeholder="America/New_York" />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
