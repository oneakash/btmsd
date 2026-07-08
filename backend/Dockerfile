# Use the lightweight Alpine Linux version of Node 18
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package files first (this caches dependencies to speed up future builds)
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy the rest of your backend code into the container
COPY . .

# Expose the port your Express API runs on
EXPOSE 5000

# Define the health check for AWS ECS Self-Healing
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:5000/api/tenders || exit 1

# Start the server
CMD ["npm", "start"]