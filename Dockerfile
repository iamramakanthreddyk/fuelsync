# Use lightweight Node 22 base image
FROM node:22-alpine

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Ensure Prisma CLI is executable
RUN chmod +x ./node_modules/.bin/prisma

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose application port
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
