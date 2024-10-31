# Use Node.js base image
FROM node:latest
# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose port
EXPOSE 5001

# Start the server
CMD [ "npm", "start" ]
