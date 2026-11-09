FROM node:22-alpine
WORKDIR /app
RUN mkdir -p /data && chown node:node /data
COPY *.mjs ./
USER node
ENV RIDER_DB=/data/rider.sqlite
CMD ["node","index.mjs"]
