FROM oven/bun@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598 AS dependencies

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts
RUN mkdir /data && chown 10001:10001 /data

FROM oven/bun:1-distroless

WORKDIR /app
ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies --chown=10001:10001 /data /data
COPY package.json tsconfig.json ./
COPY drizzle ./drizzle
COPY src ./src
COPY --from=document-templates src/features/billing-documents /spa/src/features/billing-documents
COPY --from=document-templates public/assets/ocazbike-logo.png /spa/public/assets/ocazbike-logo.png
COPY release-entrypoint.ts ./
USER 10001:10001

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/bun"]
CMD ["run", "src/server.ts"]
