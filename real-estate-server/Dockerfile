FROM apify/actor-node-playwright-chrome:22

COPY --chown=myuser:myuser package*.json ./

RUN npm --quiet set progress=false && npm install

COPY --chown=myuser:myuser . ./

RUN npm run build

