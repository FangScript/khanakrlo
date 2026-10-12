FROM node:22-bookworm-slim AS runtime

ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH" NODE_ENV=production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services ./services
COPY clients ./clients
COPY packages ./packages
COPY contracts ./contracts
COPY infrastructure ./infrastructure
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile --prod=false && chown -R node:node /app

USER node
CMD ["pnpm", "--filter", "@khana/api-gateway", "start"]
