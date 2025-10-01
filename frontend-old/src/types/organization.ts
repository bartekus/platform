import type { LucideIcon } from 'lucide-react';

export interface OrganizationData {
  id: string;
  name: string;
  description: string;
  logo?: LucideIcon;
  plan?: string;
}

export interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
}

export interface Project {
  name: string;
  url: string;
  icon: LucideIcon;
}

export interface UserData {
  name: string;
  email: string;
  avatar?: string;
}
