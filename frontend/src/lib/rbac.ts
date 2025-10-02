import type { Role } from './session';

const rank: Record<Role, number> = { member: 1, editor: 2, admin: 3 };

export const canAtLeast = (have: Role | undefined, need: Role) => have && rank[have] >= rank[need];

export const can = {
  read: (r?: Role) => canAtLeast(r, 'member'),
  create: (r?: Role) => canAtLeast(r, 'editor'),
  edit: (r?: Role) => canAtLeast(r, 'editor'),
  delete: (r?: Role) => canAtLeast(r, 'admin'),
};
