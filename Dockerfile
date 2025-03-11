FROM node:20-slim

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create a volume for persistent data
VOLUME /app/data

# Set environment variables
ENV NODE_ENV=production

# Run the application
CMD ["npm", "start"]
