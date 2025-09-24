# Stage 1: Build the React application
FROM node:22-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React application
RUN npm run build

# Stage 2: Serve the built application with Nginx
FROM nginx:stable-alpine AS production

# Copy the built React application from the build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy a custom Nginx configuration if needed (e.g., for handling react-router client-side routing)
# If using react-router, you might need an Nginx config to redirect all unknown paths to index.html
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (default for Nginx)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
