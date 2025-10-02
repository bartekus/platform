import { Link } from '@tanstack/react-router';

type Org = { id: string; name: string; role: 'admin' | 'editor' | 'member' };

export default function OrgSwitcher({ orgs, currentId }: { orgs: Org[]; currentId?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Organization:</span>
      <select
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm transition-smooth focus:outline-none focus:ring-2 focus:ring-ring"
        value={currentId}
        onChange={(e) => window.location.assign(`/org/${e.target.value}`)}
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} ({o.role})
          </option>
        ))}
      </select>
      <Link
        to="/onboarding/organization"
        className="text-sm text-accent hover:text-accent/80 transition-smooth"
      >
        + New org
      </Link>
    </div>
  );
}
