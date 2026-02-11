FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm install --omit=dev

# Copiar código fuente
COPY src ./src

# Build TypeScript
RUN npm run build || npx tsc

# Exponer puerto del Gateway
EXPOSE 3000

# Comando para iniciar el Gateway
CMD ["node", "dist/gateway/server.js"]
