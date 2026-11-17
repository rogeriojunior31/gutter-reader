# Build a partir da raiz do repo:  docker build -f deploy/Dockerfile -t gutter .
# Fase 2.4: o estágio `web` passa a ser embutido no binário via embed.FS.

FROM node:24-alpine AS web
WORKDIR /src
RUN npm i -g pnpm@12
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/reader/package.json packages/reader/
COPY packages/workers/package.json packages/workers/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @gutter/web build

FROM golang:1.27-alpine AS server
WORKDIR /src/server
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ ./
ARG VERSION=dev
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.version=${VERSION}" -o /out/gutter ./cmd/gutter

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=server /out/gutter /gutter
ENV GUTTER_ADDR=:8080 GUTTER_LIBRARY=/library GUTTER_DATA=/data GUTTER_CACHE=/cache
EXPOSE 8080
VOLUME ["/data", "/cache"]
ENTRYPOINT ["/gutter"]
