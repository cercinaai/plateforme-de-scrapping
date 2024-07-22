# Use the official Node.js image as the base image
FROM node:22.5.1

# Create and set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code

COPY . .

# Build the application

RUN npm run build


