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

FROM oven/bun:1-distroless AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3111

COPY --from=builder --chown=10003:10003 /app/dist ./dist
COPY --chown=10003:10003 server.ts ./server.ts

USER 10003:10003
EXPOSE 3111

ENTRYPOINT ["/usr/local/bin/bun"]
CMD ["run", "server.ts"]
