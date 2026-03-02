FROM node:20-alpine

WORKDIR /app

# Install curl and bash
RUN apk add --no-cache bash curl

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "index.js"]
