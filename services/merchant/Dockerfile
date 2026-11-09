FROM node:22-alpine
WORKDIR /app
RUN mkdir -p /data && chown node:node /data
COPY *.mjs ./
USER node
ENV MERCHANT_DB=/data/merchant.sqlite
CMD ["node","index.mjs"]
