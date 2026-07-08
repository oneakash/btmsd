# STAGE 1: Build the React Application
FROM node:18-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
# This compiles your React app into the /build folder
RUN npm run build 

# STAGE 2: Serve with Nginx
FROM nginx:alpine
# Copy the compiled static files from Stage 1 into Nginx
COPY --from=build /usr/src/app/build /usr/share/nginx/html

# Expose standard HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]