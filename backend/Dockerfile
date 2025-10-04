FROM node:20-alpine

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm install

# Copiar código fonte
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "dev"]
