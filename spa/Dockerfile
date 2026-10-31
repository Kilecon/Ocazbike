FROM oven/bun@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG BUN_PUBLIC_API_URL=http://localhost:3000
ARG BUN_PUBLIC_APP_ID=my-spa
ENV BUN_PUBLIC_API_URL=${BUN_PUBLIC_API_URL}
ENV BUN_PUBLIC_APP_ID=${BUN_PUBLIC_APP_ID}

RUN bun run styles:build && bun run build.ts --no-sourcemap

FROM oven/bun@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598 AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3111

COPY --from=builder --chown=10001:10001 /app/dist ./dist
COPY --chown=10001:10001 server.ts ./server.ts

USER 10001:10001
EXPOSE 3111

CMD ["bun", "run", "server.ts"]
