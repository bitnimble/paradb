# syntax=docker/dockerfile:1.7-labs
FROM oven/bun:1

COPY --exclude=node_modules ./ /etc/paradb/paradb
WORKDIR /etc/paradb/paradb

ARG SENTRY_AUTH_TOKEN

RUN apt update
RUN DEBIAN_FRONTEND=noninteractive apt install ca-certificates -y
RUN bun install
RUN bun next build

ENTRYPOINT ["tools/docker/start.sh"]
