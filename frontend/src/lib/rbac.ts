import type { Profile } from "./api";
export function hasPerm(p: Profile | undefined, perm: string, orgId?: string) {
  if (!p?.customData) return false;
  // adapt to your shape; example assumes role list or permission list
  return p.customData.roles?.includes("admin") || p.customData.permissions?.includes(perm);
}

// import type { Role } from './session';
//
// const rank: Record<Role, number> = { member: 1, editor: 2, admin: 3 };
//
// export const canAtLeast = (have: Role | undefined, need: Role) => have && rank[have] >= rank[need];
//
// export const can = {
//   read: (r?: Role) => canAtLeast(r, 'member'),
//   create: (r?: Role) => canAtLeast(r, 'editor'),
//   edit: (r?: Role) => canAtLeast(r, 'editor'),
//   delete: (r?: Role) => canAtLeast(r, 'admin'),
// };
