FROM node:22-alpine
WORKDIR /app
COPY index.mjs server.mjs store.mjs ./
COPY public ./public
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8086
CMD ["node","index.mjs"]
