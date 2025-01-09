# Étape 1 : Construire l'application Angular
FROM node:22.5.1 AS build

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install

COPY . .

RUN npm run build --prod

# Étape 2 : Utiliser NGINX pour servir l'application
FROM nginx:alpine

COPY --from=build /usr/src/app/dist/real-estate-dashboard/browser /usr/share/nginx/html

# Supprime la configuration par défaut de NGINX
RUN rm /etc/nginx/conf.d/default.conf

# Copie votre configuration NGINX personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
