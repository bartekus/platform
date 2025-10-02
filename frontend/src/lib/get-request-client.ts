import Client from './client';
import { encoreApiEndpoint } from '../config/logto';

/**
 * Returns the generated Encore request client.
 * Automatically includes auth token from localStorage if available.
 */
const getRequestClient = (token?: string) => {
  const logtoToken = token || localStorage.getItem('access_token') || '';
  const auth = logtoToken ? `Bearer ${logtoToken}` : '';

  return new Client(encoreApiEndpoint, {
    auth: { authorization: auth },
  });
};

export default getRequestClient;
