# observertc-stats — production image
#
# Multi-stage, standalone output, non-root. Every setting the app needs is read
# from the environment at *runtime*, so one image runs against any S3-compatible
# bucket: a developer's MinIO, staging and production differ by env alone.
#
#   docker run --rm -p 3000:3000 --env-file .env.local observertc/stats-dashboard
#
# ...or to build it here:
#
#   docker build -t observertc-stats .
#   docker run --rm -p 3000:3000 --env-file .env.local observertc-stats
#
# Build-time arguments are limited to what genuinely cannot be deferred (see
# NEXT_PUBLIC_API_BASE_URL below); credentials are never among them.

# ── deps ────────────────────────────────────────────────────────────────────
# Split from the build so a source-only change reuses the installed layer.
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
# `npm ci` for a build: it installs exactly the lockfile and fails if the two
# have drifted, which is what makes an image reproducible.
RUN npm ci --no-audit --no-fund

# ── build ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The one value that cannot be deferred to runtime: `NEXT_PUBLIC_*` is inlined
# into the browser bundle at build time. Empty means "same origin as the page",
# which is what a normal deployment wants — set it only when the API is served
# from a different host.
ARG NEXT_PUBLIC_API_BASE_URL=""
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

# Typecheck and the test suite run here so a broken build never becomes an
# image. Both are offline — the tests read fixtures, not the network.
RUN npm run typecheck && npm test && npm run build

# ── runtime ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Static OCI metadata, so a `docker build` here produces the same labels the
# release workflow attaches. `docker/metadata-action` overrides these with
# repository- and tag-derived values when the image is built in CI; they are the
# floor, not the ceiling — an image pulled from anywhere states its licence.
LABEL org.opencontainers.image.title="observertc-stats" \
      org.opencontainers.image.description="WebRTC diagnostics dashboard for observer-js ClientSample streams and mediasoup router samples" \
      org.opencontainers.image.licenses="Apache-2.0" \
      org.opencontainers.image.vendor="ObserveRTC" \
      org.opencontainers.image.url="https://observertc.org/"

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Every storage setting the image accepts, declared with empty defaults so they
# are discoverable — `docker inspect` and `docker run --env` both show them, and
# nobody has to read the source to learn what this container is configured by.
# Real values arrive at `docker run`; nothing here is baked into a layer.
#
#   S3_BUCKET             required — bucket holding <roomId>/<callId>/ folders
#   S3_ENDPOINT           omit for AWS S3; set for MinIO, R2, self-hosted
#   S3_PUBLIC_ENDPOINT    set only when the browser reaches storage by a
#                         different name than the server does; a presigned URL
#                         is signed for one host and must match the one that
#                         follows it
#   S3_REGION             default us-east-1 (MinIO ignores it; R2 wants `auto`)
#   S3_ACCESS_KEY_ID      omit both keys to use the SDK credential chain
#   S3_SECRET_ACCESS_KEY    (an instance/task role, a mounted profile)
#   S3_FORCE_PATH_STYLE   true for MinIO and most self-hosted, false for AWS/R2
#   S3_PRESIGN_TTL        presigned URL lifetime in seconds, default 900
ENV S3_BUCKET="" \
    S3_ENDPOINT="" \
    S3_PUBLIC_ENDPOINT="" \
    S3_REGION="us-east-1" \
    S3_ACCESS_KEY_ID="" \
    S3_SECRET_ACCESS_KEY="" \
    S3_FORCE_PATH_STYLE="true" \
    S3_PRESIGN_TTL="900"

# `wget` (busybox, already present) serves the healthcheck — no extra package.
# Running as the image's existing unprivileged user rather than root.
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nextjs

# `standalone` traces exactly what the server imports and bundles it with a
# minimal node_modules — the AWS SDK alone would otherwise dominate the image.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
# `public/` is currently near-empty but the path must exist: Next's server
# resolves static files through it, and a missing directory is an error rather
# than an empty one.
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# The licence travels with the binary. Apache-2.0 requires a copy of the licence
# and any NOTICE to accompany redistribution, and a container image handed to
# somebody else is a redistribution.
COPY --from=build --chown=nextjs:nodejs /app/LICENSE /app/NOTICE ./

USER nextjs
EXPOSE 3000

# Shallow by design: the deep probe (`?deep=1`) lists a key from the bucket, and
# a container should not be restarted because storage had a bad minute. Point a
# readiness probe at the deep one instead.
#
# The shallow probe fails only on a *fatal* configuration problem — no bucket,
# or a malformed endpoint. Absent credentials are a warning, not a failure,
# because an ECS/EKS task using an instance role sets neither key and is
# correct; failing on it would restart-loop a container that was serving fine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
