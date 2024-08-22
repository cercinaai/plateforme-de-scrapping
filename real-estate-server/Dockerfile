FROM apify/actor-node-playwright-chrome:22-1.45.2

COPY --chown=myuser:myuser package*.json ./

RUN npm --quiet set progress=false \
    && npm install --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version

COPY --chown=myuser:myuser . ./

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

