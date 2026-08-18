# Arutech Workspace — apps/api production image.
#
# Build from the REPO ROOT (not apps/api), because this is a pnpm
# workspace and the API depends on packages/shared-types:
#   docker build -f docker/api.Dockerfile -t arutech-workspace-api .
#
# Multi-stage, with a dedicated `prod-deps` stage kept entirely separate
# from `build`: two earlier approaches were tried and rejected after
# actually inspecting their output filesystem —
#   - `pnpm deploy --prod <dir>` did not reliably include the freshly
#     built `dist/` in its target directory (it appears to respect this
#     repo's own .gitignore, which lists `dist/`, when deciding what to
#     copy).
#   - `pnpm prune --prod` triggered an interactive "modules directories
#     will be removed and reinstalled from scratch" prompt that, with no
#     TTY attached, proceeded anyway and wiped out the just-built `dist/`
#     as collateral.
# A second, `--prod`-only `pnpm install` in its own stage sidesteps both:
# nothing ever prunes or redeploys the `build` stage's output, so `dist/`
# is copied from `build` untouched, and `node_modules` is copied from
# `prod-deps`, which never had devDependencies in the first place.
#
# The runtime stage preserves pnpm's actual on-disk workspace layout
# (WORKDIR /workspace, not /app) rather than flattening paths, because
# pnpm's symlinks are relative and depend on it:
#   apps/api/node_modules/@arutech/shared-types -> ../../packages/shared-types
#   apps/api/node_modules/@nestjs/*             -> ../../../../node_modules/.pnpm/...
#
# NOTE on debian-slim, not alpine, plus python3/make/g++: `argon2` is a
# native addon; its `install` script's prebuild-detection doesn't
# reliably short-circuit in a fresh container install the way it does on
# a long-lived dev machine, so it falls back to compiling from source —
# alpine's musl libc also isn't what argon2 ships prebuilds for.
# Installing build tools makes this succeed unconditionally rather than
# depending on that detection.

FROM node:20-bookworm-slim AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ openssl \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /workspace

# ---------------------------------------------------------------------------
# Full install (incl. devDependencies) — used only to build.
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter "@arutech/api..."

# ---------------------------------------------------------------------------
FROM base AS build
COPY --from=deps /workspace ./
COPY tsconfig.base.json ./
COPY packages/shared-types packages/shared-types
COPY apps/api apps/api
# nest build's TypeScript compilation is memory-hungry enough to OOM on a
# small host (confirmed: crashed with "JavaScript heap out of memory" on a
# 1GB-RAM Lightsail instance, even with 2GB of swap configured — V8 sizes
# its default heap ceiling off detected physical RAM, not swap, so the
# crash happens before swap ever gets used). NODE_OPTIONS here, not in the
# runtime stage below — only the build step needs the larger ceiling, the
# actual running server doesn't.
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN pnpm --filter @arutech/shared-types build \
 && pnpm --filter @arutech/api prisma:generate \
 && pnpm --filter @arutech/api build \
 && test -f apps/api/dist/main.js  # fail the build loudly here, not at COPY time, if this ever regresses

# ---------------------------------------------------------------------------
# --prod-only install, entirely separate from `build` — never pruned,
# never deployed, just never had devDependencies to begin with. Runs its
# own `prisma generate` (which is why `prisma` — the CLI — lives in
# `dependencies`, not `devDependencies`, in apps/api/package.json: it's
# also needed for `prisma migrate deploy` at deploy time). This avoids
# needing to copy the OTHER stage's generated `.prisma/client` output
# across a pnpm-content-hashed path that would silently need updating on
# every dependency bump.
FROM base AS prod-deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter "@arutech/api..." --prod
COPY apps/api/prisma apps/api/prisma
RUN DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder" \
    pnpm --filter @arutech/api prisma:generate

# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
# openssl: Prisma's query engine links against libssl at runtime, not just
# install time — needed here even though build tools (python3/make/g++)
# are not, since this stage never runs node-gyp.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN groupadd -r arutech && useradd -r -g arutech arutech
WORKDIR /workspace

COPY --from=prod-deps /workspace/node_modules ./node_modules
COPY --from=prod-deps /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /workspace/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /workspace/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/api/prisma ./apps/api/prisma
COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json

# Everything COPY'd above is root-owned by default. STORAGE_PROVIDER=local
# (see files/storage/local-disk.storage.ts) writes under STORAGE_LOCAL_DIR
# (default "./uploads", i.e. /workspace/apps/api/uploads given the WORKDIR
# below) — the non-root `arutech` user needs to be able to create and
# write into it, or every upload 500s with EACCES (caught by actually
# uploading a file into a running container, not assumed).
RUN mkdir -p /workspace/apps/api/uploads && chown -R arutech:arutech /workspace/apps/api/uploads

USER arutech
WORKDIR /workspace/apps/api
EXPOSE 4000

# Fails fast (see src/config/env.schema.ts) if required env vars are
# missing — there is deliberately no "it mostly works" fallback path here.
CMD ["node", "dist/main.js"]
