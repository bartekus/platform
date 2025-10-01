import Client, { BaseURL } from './client';
import { encoreApiEndpoint } from '~/config/logto';

/**
 * Returns the generated Encore request client for either the localdev or deployd environment.
 * If we are running the frontend locally we assume that our Encore backend is also running locally.
 */
const getRequestClient = (token: string | undefined) => {
  const logtoToken = token ? `Bearer ${token}` : '';

  return new Client(encoreApiEndpoint, {
    auth: { authorization: logtoToken },
  });
};

export default getRequestClient;
