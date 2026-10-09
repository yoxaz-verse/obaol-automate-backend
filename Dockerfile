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


# Bring the canonical company-function taxonomy and legacy references forward
# before accepting traffic. The migration is idempotent and safe on restarts.
CMD ["sh", "-c", "node dist/scripts/migrateCompanyCapabilityProfiles.js && node dist/index.js"]
