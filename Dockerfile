# Noir:GateWay — Production Docker Image
# Multi-stage: build deps vs runtime deps

# ---- Build stage ----
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json next.config.ts ./
COPY src ./src
COPY public ./public
RUN npm run build

# ---- Runtime stage ----
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000
CMD ["npm", "start"]
