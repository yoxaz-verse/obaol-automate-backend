# Use Node.js base image
FROM node:latest

# Create app directory
WORKDIR /usr/src/app

# Copy package files and tsconfig.json (needed for the build)
COPY package*.json tsconfig.json ./

# Copy the source code (so tsc finds src/index.ts)
COPY src ./src

# Install app dependencies (postinstall will run tsc now)
RUN npm install

# Copy any remaining files (if necessary)
COPY . .

# Expose port
EXPOSE 5001

# Start the server
CMD [ "npm", "start" ]
