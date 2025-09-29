{
  "id": "platform-4g42",
  "lang": "typescript",
  "build": {
    "docker": { "bundle_source": true }
  },
  "global_cors": {
    "debug": true,

    // Unauthenticated requests (no cookies/HTTP auth/client certs)
    "allow_origins_without_credentials": ["*"],

    // Authenticated requests (cookies or Authorization header)
    "allow_origins_with_credentials": [
      "https://*.deployd.xyz"
    ],
  }
}