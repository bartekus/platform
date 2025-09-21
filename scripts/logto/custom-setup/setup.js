import { createPool, sql } from '@silverhand/slonik';
import { insertInto } from '../lib/database.js';
import {
  Applications,
  ApplicationsRoles,
  Roles,
  RolesScopes,
  SignInExperiences,
  SsoConnectors,
  Resources,
  Scopes,
  Organizations,
  OrganizationRoles,
  OrganizationScopes,
  OrganizationRoleScopeRelations,
  Connectors,
  Hooks,
} from '@logto/schemas';

import { config } from './config.js';

async function setupCustomLogto() {
  const pool = await createPool(`postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@db:5432/logto`);

  try {
    await pool.transaction(async (connection) => {
      // Add applications
      for (const app of config.applications) {
        await connection.query(insertInto(app, Applications.table));
      }
      console.log(`Added ${config.applications.length} applications`);

      // Add roles
      for (const role of config.roles) {
        await connection.query(insertInto(role, Roles.table));
      }
      console.log(`Added ${config.roles.length} roles`);

      // Add application roles
      for (const appRole of config.applications_roles) {
        await connection.query(insertInto(appRole, ApplicationsRoles.table));
      }
      console.log(`Added ${config.applications_roles.length} application roles`);

      // Add resources
      for (const resource of config.resources) {
        await connection.query(insertInto(resource, Resources.table));
      }
      console.log(`Added ${config.resources.length} resources`);

      // Add role scopes
      for (const roleScope of config.roles_scopes) {
        await connection.query(insertInto(roleScope, RolesScopes.table));
      }
      console.log(`Added ${config.roles_scopes.length} role scopes`);

      // Update sign in experiences instead of inserting
      for (const experience of config.sign_in_experiences) {
        await connection.query(sql`
            UPDATE sign_in_experiences
            SET
              color = ${sql.json(experience.color)},
              branding = ${sql.json(experience.branding)},
              language_info = ${sql.json(experience.language_info)},
              terms_of_use_url = ${experience.terms_of_use_url},
              privacy_policy_url = ${experience.privacy_policy_url},
              sign_in = ${sql.json(experience.sign_in)},
              sign_up = ${sql.json(experience.sign_up)},
              social_sign_in_connector_targets = ${sql.json(experience.social_sign_in_connector_targets)},
              sign_in_mode = ${experience.sign_in_mode},
              custom_css = ${experience.custom_css},
              custom_content = ${sql.json(experience.custom_content)},
              password_policy = ${sql.json(experience.password_policy)},
              mfa = ${sql.json(experience.mfa)},
              single_sign_on_enabled = ${experience.single_sign_on_enabled}
            WHERE tenant_id = ${experience.tenantId} AND id = ${experience.id}
          `);
      }
      console.log(`Updated ${config.sign_in_experiences.length} sign in experiences`);

      // Add SSO connectors
      for (const connector of config.sso_connectors) {
        await connection.query(insertInto(connector, SsoConnectors.table));
      }
      console.log(`Added ${config.sso_connectors.length} SSO connectors`);

      // Add organizations
      for (const org of config.organizations) {
        await connection.query(insertInto(org, Organizations.table));
      }
      console.log(`Added ${config.organizations.length} organizations`);

      // Add organization roles
      for (const role of config.organization_roles) {
        await connection.query(insertInto(role, OrganizationRoles.table));
      }
      console.log(`Added ${config.organization_roles.length} organization roles`);

      // Add organization scopes
      for (const scope of config.organization_scopes) {
        await connection.query(insertInto(scope, OrganizationScopes.table));
      }
      console.log(`Added ${config.organization_scopes.length} organization scopes`);

      // Add organization role scope relations
      for (const relation of config.organization_role_scope_relations) {
        await connection.query(insertInto(relation, OrganizationRoleScopeRelations.table));
      }
      console.log(`Added ${config.organization_role_scope_relations.length} organization role scope relations`);

      // Add connectors
      for (const connector of config.connectors) {
        // Convert config object to string if it's not already a string
        const connectorToInsert = {
          ...connector,
          config: typeof connector.config === 'string' ?
            connector.config :
            JSON.stringify(connector.config),
          metadata: typeof connector.metadata === 'string' ?
            connector.metadata :
            JSON.stringify(connector.metadata)
        };

        await connection.query(insertInto(connectorToInsert, Connectors.table));
      }
      console.log(`Added ${config.connectors.length} connectors`);

      //Add webhooks
      for (const webhook of config.webhooks) {
        await connection.query(insertInto(webhook, Hooks.table));
      }
      console.log(`Added ${config.webhooks.length} webhooks`);
    });

    console.log('Custom setup completed successfully');
  } catch (error) {
    console.error('Error during custom setup:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

export { setupCustomLogto };
