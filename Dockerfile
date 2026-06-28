FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY . .
RUN pnpm build

FROM base AS runner

ENV NODE_ENV=production

# Install Pandoc and LibreOffice for document conversion
RUN apt-get update && apt-get install -y \
    pandoc \
    libreoffice-writer \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/.output ./.output

RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
