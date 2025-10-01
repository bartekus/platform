import * as React from 'react';
import { ChevronsUpDown, Plus, GalleryVerticalEnd } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '~/components/ui/sidebar';
import { useOrganizations } from '~/hooks/use-organizations';

interface TeamSwitcherProps {
  teams: {
    id: string;
    name: string;
    logo: React.ElementType;
    plan?: string;
  }[];
  onTeamSelect: (teamId: string) => void;
  activeTeamId?: string;
  onTeamCreated?: () => void;
}

export function TeamSwitcher({ teams, onTeamSelect, activeTeamId, onTeamCreated }: TeamSwitcherProps) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false);
  const [newTeamName, setNewTeamName] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Find active team based on activeTeamId prop
  const activeTeam = React.useMemo(() => teams.find((team) => team.id === activeTeamId) || teams[0], [teams, activeTeamId]);

  const { createOrganization } = useOrganizations();

  const handleTeamChange = (team: (typeof teams)[0]) => {
    onTeamSelect(team.id);
    navigate(`/${team.id}`);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    try {
      setIsSubmitting(true);
      const newOrg = await createOrganization(newTeamName.trim());
      setShowNewTeamDialog(false);
      setNewTeamName('');
      // Call the onTeamCreated callback
      onTeamCreated?.();
      // Navigate to the new organization
      navigate(`/${newOrg.id}`);
    } catch (error) {
      console.error('Failed to create team:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  {activeTeam?.logo && React.createElement(activeTeam.logo, { className: 'size-4' })}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{activeTeam?.name || 'Select Team'}</span>
                  {activeTeam?.plan && <span className="truncate text-xs">{activeTeam.plan}</span>}
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">Teams</DropdownMenuLabel>
              {teams.map((team, index) => (
                <DropdownMenuItem key={team.name} onClick={() => handleTeamChange(team)} className="gap-2 p-2">
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    {/*{React.createElement(team.logo, { className: 'size-4 shrink-0' })}*/}
                  </div>
                  {team.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowNewTeamDialog(true)} className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <Plus className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">Create team</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create team</DialogTitle>
            <DialogDescription>Add a new team to manage projects and collaborate with others.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTeam}>
            <div className="space-y-4 py-2 pb-4">
              <div className="space-y-2">
                <Input id="name" placeholder="Team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewTeamDialog(false)} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
