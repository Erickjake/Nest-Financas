# ==========================================
# Estágio 1: BUILDER
# ==========================================
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl
WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

RUN npx prisma generate

COPY . .
RUN npm run build
# 👇 Comando de debug: vai imprimir no seu terminal se a pasta dist existe
RUN ls -la dist 

# ==========================================
# Estágio 2: PRODUCTION
# ==========================================
FROM node:20-alpine AS production

RUN apk add --no-cache openssl
WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev
RUN npx prisma generate

# Copia a pasta dist do builder para a raiz da produção
COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3000

# 👇 Mudamos para o caminho exato do arquivo gerado pelo NestJS
CMD ["node", "dist/src/main.js"]