# Stage: base
FROM node:20-alpine AS base
WORKDIR /usr/src
RUN apk add --no-cache bash git openssh

# Stage: install deps (monorepo)
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/runner/package.json apps/runner/package.json
RUN npm ci

# Stage: build api
FROM deps AS api-build
WORKDIR /usr/src/apps/api
COPY apps/api ./
RUN npm run build

# Stage: build web
FROM deps AS web-build
WORKDIR /usr/src/apps/web
COPY apps/web ./
RUN npm run build

# Stage: build runner
FROM deps AS runner-build
WORKDIR /usr/src/apps/runner
COPY apps/runner ./
RUN npm run build

# Stage: api runtime
FROM node:20-alpine AS api
WORKDIR /usr/src/api
ENV NODE_ENV=production
COPY --from=api-build /usr/src/apps/api/dist ./dist
COPY apps/api/package.json ./
RUN npm ci --only=production
EXPOSE 4000
CMD ["node", "dist/server.js"]

# Stage: web runtime
FROM node:20-alpine AS web
WORKDIR /usr/src/web
ENV NODE_ENV=production
COPY --from=web-build /usr/src/apps/web/.next ./.next
COPY apps/web/package.json ./
COPY apps/web/public ./public
RUN npm ci --only=production
EXPOSE 3000
CMD ["npm", "start"]

# Stage: runner runtime
FROM node:20-alpine AS runner
WORKDIR /usr/src/runner
ENV NODE_ENV=production
COPY --from=runner-build /usr/src/apps/runner/dist ./dist
COPY apps/runner/package.json ./
RUN npm ci --only=production
EXPOSE 5000
CMD ["node", "dist/server.js"]
