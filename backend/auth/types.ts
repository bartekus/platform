import { Header } from 'encore.dev/api';

// AuthParams specifies the incoming request information the auth handler is interested in.
// In this case it only cares about requests that contain the `Authorization` header.
export interface AuthParams {
  token: Header<'Authorization'>;
}

// The AuthData specifies the information about the authenticated user that the auth handler makes available.
export interface AuthData {
  userID: string;
  clientID: string;
  organizationID: string | undefined;
  scopes: string[];
}
