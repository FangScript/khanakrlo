FROM node:22-alpine
WORKDIR /app
RUN mkdir -p /data && chown node:node /data
COPY *.mjs ./
USER node
ENV ORDERS_DB=/data/orders.sqlite
CMD ["node","index.mjs"]
