FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy server code
COPY server/ ./server/

# Expose the API port
EXPOSE 5174

# Run the server
CMD ["node", "server/index.js"]
