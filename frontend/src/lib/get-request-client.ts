import Client, { Environment, Local } from './client';

/**
 * Returns the generated Encore request client for either the local or staging environment.
 * If we are running the frontend locally we assume that our Encore backend is also running locally.
 */
const getRequestClient = (token: string | undefined) => {
  const env = import.meta.env.DEV ? Local : Environment('staging');

  const logtoToken = token ? `Bearer ${token}` : '';

  return new Client(env, {
    auth: { token: logtoToken },
  });
};

export default getRequestClient;
