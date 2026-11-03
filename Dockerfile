FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose app port
EXPOSE 5000

# Start server
CMD ["node", "server/server.js"]
