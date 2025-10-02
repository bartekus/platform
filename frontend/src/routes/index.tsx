import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Shield, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="container mx-auto px-4">
      <section className="py-20 gradient-hero rounded-2xl my-8">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold mb-6">Developer-first, RBAC-ready SaaS Platform</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Sign in to start your trial. Create an org, invite teammates, and ship faster with built-in authentication, role-based
            access control, and workspace management.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/signin">
              <Button variant="accent" size="lg">
                Get Started
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6 py-16">
        <div className="p-6 border rounded-xl gradient-card">
          <Shield className="h-10 w-10 text-accent mb-4" />
          <h3 className="text-xl font-semibold mb-2">Enterprise Auth</h3>
          <p className="text-muted-foreground">Powered by Logto with organization support, SSO, and MFA ready out of the box.</p>
        </div>
        <div className="p-6 border rounded-xl gradient-card">
          <Users className="h-10 w-10 text-accent mb-4" />
          <h3 className="text-xl font-semibold mb-2">Role-Based Access</h3>
          <p className="text-muted-foreground">Granular permissions with admin, editor, and member roles across all workspaces.</p>
        </div>
        <div className="p-6 border rounded-xl gradient-card">
          <Zap className="h-10 w-10 text-accent mb-4" />
          <h3 className="text-xl font-semibold mb-2">Multi-Workspace</h3>
          <p className="text-muted-foreground">Organize your teams with unlimited workspaces, file management, and audit logs.</p>
        </div>
      </section>
    </div>
  );
}
