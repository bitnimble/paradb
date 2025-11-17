# syntax=docker/dockerfile:1.7-labs
FROM node:lts-bookworm-slim

COPY --exclude=node_modules ./ /etc/paradb/paradb
WORKDIR /etc/paradb/paradb

ARG PGHOST
ARG PGPORT
ARG PGUSER
ARG PGDATABASE
ARG PGPASSWORD
ARG MEILISEARCH_HOST
ARG MAPS_DIR

ENV PGHOST=$PGHOST
ENV PGPORT=$PGPORT
ENV PGUSER=$PGUSER
ENV PGDATABASE=$PGDATABASE
ENV PGPASSWORD=$PGPASSWORD
ENV MEILISEARCH_HOST=$MEILISEARCH_HOST
ENV MAPS_DIR=$MAPS_DIR

RUN apt update
RUN DEBIAN_FRONTEND=noninteractive apt install postgresql-client ca-certificates -y
RUN yarn install
RUN yarn build

ENTRYPOINT ["tools/docker/start.sh"]
