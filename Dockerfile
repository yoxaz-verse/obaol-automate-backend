# ---------- Builder stage ----------
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source & tsconfig
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript → dist
RUN npm run build


# ---------- Runtime stage ----------
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy only runtime artifacts
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# CapRover internal port
EXPOSE 5001

# Optional but recommended healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -qO- http://localhost:5001/ping || exit 1

# Start compiled JS (NO tsx, NO ts-node)
CMD ["node", "dist/index.js"]
