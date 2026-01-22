FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy application files
COPY . .

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "src/index.js"]
