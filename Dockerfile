# Use Node.js base image
FROM node:latest

# Set working directory
WORKDIR /usr/src/app

# Copy package files and tsconfig.json
COPY package*.json tsconfig.json ./

# Copy the source code
COPY src ./src

# Install dependencies
RUN npm install

# Explicitly build the project (runs "tsc" as defined in package.json)
RUN npm run build

# Copy any remaining files (if needed)
COPY . .

# Expose the port your app listens on
EXPOSE 5001

# Start the server
CMD [ "npm", "start" ]
