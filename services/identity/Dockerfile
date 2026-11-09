FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY index.mjs .
USER node
CMD ["node","index.mjs"]
