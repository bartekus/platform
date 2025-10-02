// Legacy collections - these are being replaced by the new organization-based collections
// This file is kept for backward compatibility during migration
// TODO: Remove this file after migration is complete

import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { selectTodoSchema, selectProjectSchema, selectUsersSchema } from "~/db/schema";

export const usersCollection = createCollection(
  electricCollectionOptions({
    id: "users",
    shapeOptions: {
      url: new URL(`/api/users`, typeof window !== `undefined` ? window.location.origin : `http://localhost:5173`).toString(),
      parser: {
        timestamptz: (date: string) => {
          return new Date(date);
        },
      },
    },
    schema: selectUsersSchema,
    getKey: (item) => item.id,
  })
);

export const projectCollection = createCollection(
  electricCollectionOptions({
    id: "projects",
    shapeOptions: {
      url: new URL(`/api/projects`, typeof window !== `undefined` ? window.location.origin : `http://localhost:5173`).toString(),
      parser: {
        timestamptz: (date: string) => {
          return new Date(date);
        },
      },
    },
    schema: selectProjectSchema,
    getKey: (item) => item.id,
    // Legacy project operations - no longer used
  })
);

export const todoCollection = createCollection(
  electricCollectionOptions({
    id: "todos",
    shapeOptions: {
      url: new URL(`/api/todos`, typeof window !== `undefined` ? window.location.origin : `http://localhost:5173`).toString(),
      parser: {
        timestamptz: (date: string) => {
          return new Date(date);
        },
      },
    },
    schema: selectTodoSchema,
    getKey: (item) => item.id,
    // Legacy todo operations - no longer used
  })
);
