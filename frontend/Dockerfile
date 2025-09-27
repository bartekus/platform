# Stage 1: Build the React (Vite) application
FROM node:22-alpine AS build
WORKDIR /app

# Install deps with better caching
COPY package*.json ./
RUN npm ci

# Build
COPY . .
RUN npm run build  # produces /app/dist

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine AS production
RUN apk add --no-cache gettext   # for envsubst

# (Optional) SPA history fallback for React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Vite output
COPY --from=build /app/dist /usr/share/nginx/html

# ensure the tmpl ends up in the served root (e.g. copied from build or repo)
COPY public/env.js.tmpl /usr/share/nginx/html/env.js.tmpl

# 10-line startup hook
# 10-line startup hook (actually 3 lines via printf)
RUN printf '%s\n' \
  '#!/bin/sh' \
  'set -eu' \
  'envsubst < /usr/share/nginx/html/env.js.tmpl > /usr/share/nginx/html/env.js' \
  > /docker-entrypoint.d/40-env.sh \
  && chmod +x /docker-entrypoint.d/40-env.sh

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
