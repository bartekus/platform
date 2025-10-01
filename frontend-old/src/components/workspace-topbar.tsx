import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';

interface WorkspaceTopbarProps {
  title: string;
  organizationId?: string;
  workspaceId?: string;
  showBackButton?: boolean;
  actions?: React.ReactNode;
}

export function WorkspaceTopbar({ title, organizationId, workspaceId, showBackButton, actions }: WorkspaceTopbarProps) {
  const backUrl = workspaceId ? `/${organizationId}` : '/';

  return (
    <div className="flex h-14 items-center justify-between border-b px-4 lg:px-8">
      <div className="flex items-center gap-4">
        {showBackButton && (
          <>
            <Button variant="ghost" size="icon" asChild>
              <Link to={backUrl} className="-ml-2">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-4" />
          </>
        )}
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
} 