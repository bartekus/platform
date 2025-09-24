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

# (Optional) SPA history fallback for React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Vite output
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]