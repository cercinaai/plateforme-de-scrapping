# Use the official Node.js image as the base image
FROM node:22.5.1 AS build

# Set the working directory
WORKDIR /usr/src/app

COPY package.json .

# Install dependencies
RUN npm install

# Copy the entire project to the working directory
COPY . .

# Build the Angular app in production mode
RUN npm run build --prod

# Step 2: Serve the Angular application with Nginx
FROM alpine:3.17

WORKDIR /frontend

# Copy the built Angular app from the previous stage
COPY --from=build /usr/src/app/dist/real-estate-dashboard/browser .


CMD ["sh", "-c", "echo 'Angular app built and copied!'"]

