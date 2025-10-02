import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { 
  selectOrganizationSchema, 
  selectWorkspaceSchema, 
  selectFileSchema,
  type Organization,
  type Workspace,
  type File
} from "~/db/schema";
import { useLogto } from "@logto/react";
import { appConfig } from "~/config/logto";
import getRequestClient from "~/lib/get-request-client";

// Organizations collection - syncs with Logto organizations
export const organizationsCollection = createCollection(
  electricCollectionOptions({
    id: "organizations",
    shapeOptions: {
      url: new URL(`/api/organizations`, typeof window !== `undefined` ? window.location.origin : `http://localhost:5173`).toString(),
      parser: {
        timestamptz: (date: string) => {
          return new Date(date);
        },
      },
    },
    schema: selectOrganizationSchema,
    getKey: (item) => item.id,
    // Organization operations will be handled by components with proper auth context
    // This collection is mainly for real-time sync of organization data
  })
);

// Workspaces collection - syncs with Encore workspace API
export const workspacesCollection = createCollection(
  electricCollectionOptions({
    id: "workspaces",
    shapeOptions: {
      url: new URL(`/api/workspaces`, typeof window !== `undefined` ? window.location.origin : `http://localhost:5173`).toString(),
      parser: {
        timestamptz: (date: string) => {
          return new Date(date);
        },
      },
    },
    schema: selectWorkspaceSchema,
    getKey: (item) => item.id,
    // Workspace operations will be handled by components with proper auth context
    // This collection is mainly for real-time sync of workspace data
  })
);

// Files collection - syncs with Encore file upload API
export const filesCollection = createCollection(
  electricCollectionOptions({
    id: "files",
    shapeOptions: {
      url: new URL(`/api/files`, typeof window !== `undefined` ? window.location.origin : `http://localhost:5173`).toString(),
      parser: {
        timestamptz: (date: string) => {
          return new Date(date);
        },
      },
    },
    schema: selectFileSchema,
    getKey: (item) => item.id,
    // File operations will be handled by components with proper auth context
    // This collection is mainly for real-time sync of file metadata
  })
);

// Note: These collections will be used with proper Logto and Encore integration
// The actual token management and API calls will be handled by the components
// that use these collections, ensuring proper authentication context
