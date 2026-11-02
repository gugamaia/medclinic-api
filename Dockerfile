# Build multi-estagio: a imagem final nao carrega devDependencies nem
# codigo-fonte TypeScript, apenas o JS compilado e as dependencias de
# producao - imagem menor e sem ferramentas de build expostas.

# ---- Estagio 1: build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json .npmrc ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- Estagio 2: producao ----
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 3000

# RP10 - a aplicacao escuta em 0.0.0.0 (ver src/main.ts), compativel com
# o mapeamento de porta do Docker.
CMD ["node", "dist/main"]
