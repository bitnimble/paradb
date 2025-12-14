# syntax=docker/dockerfile:1.7-labs
FROM node:lts-bookworm-slim

COPY --exclude=node_modules ./ /etc/paradb/paradb
WORKDIR /etc/paradb/paradb

ARG SENTRY_AUTH_TOKEN

RUN apt update
RUN DEBIAN_FRONTEND=noninteractive apt install ca-certificates -y
RUN yarn install
RUN yarn next build --webpack

ENTRYPOINT ["tools/docker/start.sh"]
