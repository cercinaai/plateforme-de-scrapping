# Use the official Node.js image as the base image
FROM node:22.5.1 AS build

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the entire project to the working directory
COPY . .

# Build the Angular app in production mode
RUN npm run build

# Step 2: Serve the Angular application with Nginx
FROM nginx:alpine


# Copy the built Angular app from the previous stage
COPY --from=build /usr/src/app/dist/real-estate-dashboard /usr/share/nginx/html

# Copy custom Nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]