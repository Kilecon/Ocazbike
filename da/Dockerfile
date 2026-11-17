FROM oven/bun@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598 AS dependencies

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598

WORKDIR /app
ENV NODE_ENV=production

RUN groupadd --gid 10001 api \
    && useradd --uid 10001 --gid api --no-create-home --shell /usr/sbin/nologin api \
    && mkdir -p /data \
    && chown api:api /data

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY drizzle ./drizzle
COPY src ./src
USER 10001:10001

EXPOSE 3000

CMD ["bun", "run", "src/server.ts"]
