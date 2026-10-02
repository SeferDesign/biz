ARG NODE_VERSION_MAJOR=24
ARG BUILD_ENV=prod

# Shared base for every stage so local and production run the same runtime.
FROM node:${NODE_VERSION_MAJOR}-bookworm-slim AS node-base
ARG BUILD_ENV
ENV BUILD_ENV=${BUILD_ENV} \
	NODE_ENV=production \
	NPM_CONFIG_UPDATE_NOTIFIER=false \
	NPM_CONFIG_FUND=false
WORKDIR /app
COPY docker/api-entrypoint.sh /usr/local/bin/biz-entrypoint.sh
RUN chmod +x /usr/local/bin/biz-entrypoint.sh

# Dependency layer: cached until a manifest changes.
FROM node-base AS deps
COPY package.json package-lock.json ./
COPY api/package.json ./api/package.json
COPY web/package.json ./web/package.json
COPY company/package.json ./company/package.json
RUN --mount=type=cache,target=/root/.npm \
	npm ci --include=dev --no-audit --no-fund

# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

FROM node-base AS api-local
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY company ./company
COPY api ./api
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/biz-entrypoint.sh"]
CMD ["node", "--watch", "api/src/server.js"]

FROM node-base AS api-production
COPY package.json package-lock.json ./
COPY api/package.json ./api/package.json
COPY web/package.json ./web/package.json
COPY company/package.json ./company/package.json
RUN --mount=type=cache,target=/root/.npm \
	npm ci --omit=dev --workspace @seferbiz/api --include-workspace-root --no-audit --no-fund
COPY company ./company
COPY api ./api
USER node
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/biz-entrypoint.sh"]
CMD ["node", "api/src/server.js"]

# ---------------------------------------------------------------------------
# Web (Next.js)
# ---------------------------------------------------------------------------

FROM node-base AS web-local
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY company ./company
COPY web ./web
WORKDIR /app/web
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/biz-entrypoint.sh"]
# Invoked directly rather than through npm so Next.js receives container signals.
CMD ["node", "/app/node_modules/next/dist/bin/next", "dev", "--hostname", "0.0.0.0"]

FROM deps AS web-builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY company ./company
COPY web ./web
WORKDIR /app/web
RUN npm run build

FROM node-base AS web-production
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY api/package.json ./api/package.json
COPY web/package.json ./web/package.json
COPY company/package.json ./company/package.json
RUN --mount=type=cache,target=/root/.npm \
	npm ci --omit=dev --workspace @seferbiz/web --include-workspace-root --no-audit --no-fund
COPY company ./company
COPY web ./web
COPY --from=web-builder /app/web/.next ./web/.next
WORKDIR /app/web
USER node
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/biz-entrypoint.sh"]
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"]
