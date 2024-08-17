FROM node:22.5.1-bookworm

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

RUN npx -y playwright@1.45.2 install --with-deps

COPY . .

RUN npm run build