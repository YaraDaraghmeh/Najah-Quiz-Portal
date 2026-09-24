FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY prisma ./prisma
COPY lib ./lib
COPY src ./src
COPY server ./server
COPY index.html vite.config.ts tsconfig.json ./
COPY server.ts ./
COPY docker-entrypoint.sh ./

RUN sed -i 's/\r$//' docker-entrypoint.sh \
    && chmod +x docker-entrypoint.sh \
    && npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/dev.db

RUN mkdir -p /app/data

EXPOSE 3000

ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
