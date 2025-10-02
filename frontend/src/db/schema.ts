import { z } from "zod";
import { createSchemaFactory } from "drizzle-zod";
import { boolean, integer, pgTable, timestamp, varchar, text } from "drizzle-orm/pg-core";

import { users } from "./auth-schema";
export * from "./auth-schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({ zodInstance: z });

// Legacy tables (to be removed after migration)
export const projectsTable = pgTable(`projects`, {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  shared_user_ids: text("shared_user_ids").array().notNull().default([]),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  owner_id: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const todosTable = pgTable(`todos`, {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  text: varchar({ length: 500 }).notNull(),
  completed: boolean().notNull().default(false),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  project_id: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  user_ids: text("user_ids").array().notNull().default([]),
});

// New organization-based tables
export const organizationsTable = pgTable(`organizations`, {
  id: varchar({ length: 255 }).primaryKey(), // Logto organization ID
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const workspacesTable = pgTable(`workspaces`, {
  id: varchar({ length: 255 }).primaryKey(), // Encore workspace ID
  title: varchar({ length: 255 }).notNull(),
  content: text(),
  preview: text(),
  organization_id: varchar({ length: 255 })
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updated_by: varchar({ length: 255 }).notNull(),
});

export const filesTable = pgTable(`files`, {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  url: text().notNull(),
  mime_type: varchar({ length: 100 }),
  uploaded_by: varchar({ length: 255 }).notNull(),
  organization_id: varchar({ length: 255 })
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  workspace_id: varchar({ length: 255 })
    .notNull()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// Legacy schemas (to be removed after migration)
export const selectProjectSchema = createSelectSchema(projectsTable);
export const createProjectSchema = createInsertSchema(projectsTable).omit({
  created_at: true,
});
export const updateProjectSchema = createUpdateSchema(projectsTable);

export const selectTodoSchema = createSelectSchema(todosTable);
export const createTodoSchema = createInsertSchema(todosTable).omit({
  created_at: true,
});
export const updateTodoSchema = createUpdateSchema(todosTable);

export type Project = z.infer<typeof selectProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type Todo = z.infer<typeof selectTodoSchema>;
export type UpdateTodo = z.infer<typeof updateTodoSchema>;

// New schemas
export const selectOrganizationSchema = createSelectSchema(organizationsTable);
export const createOrganizationSchema = createInsertSchema(organizationsTable).omit({
  created_at: true,
  updated_at: true,
});
export const updateOrganizationSchema = createUpdateSchema(organizationsTable);

export const selectWorkspaceSchema = createSelectSchema(workspacesTable);
export const createWorkspaceSchema = createInsertSchema(workspacesTable).omit({
  created_at: true,
  updated_at: true,
});
export const updateWorkspaceSchema = createUpdateSchema(workspacesTable);

export const selectFileSchema = createSelectSchema(filesTable);
export const createFileSchema = createInsertSchema(filesTable).omit({
  created_at: true,
});
export const updateFileSchema = createUpdateSchema(filesTable);

export type Organization = z.infer<typeof selectOrganizationSchema>;
export type CreateOrganization = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>;

export type Workspace = z.infer<typeof selectWorkspaceSchema>;
export type CreateWorkspace = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspace = z.infer<typeof updateWorkspaceSchema>;

export type File = z.infer<typeof selectFileSchema>;
export type CreateFile = z.infer<typeof createFileSchema>;
export type UpdateFile = z.infer<typeof updateFileSchema>;

export const selectUsersSchema = createSelectSchema(users);
