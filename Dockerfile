# PNBOX Hub backend — Railway deploy (Node + Playwright headless + WebSocket)
FROM node:22-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Instala deps sem o postinstall (playwright install chromium) p/ build rápido
COPY package.json ./
RUN npm install --ignore-scripts

# Instala binário Chromium + libs de sistema necessárias em runtime
RUN npx playwright install --with-deps chromium

COPY . .

# Build do frontend (vite) + backend bundle (esbuild)
RUN npm run build

EXPOSE 8080
CMD ["node", "dist/server.cjs"]
