# Stage 1: Use Bun to install production dependencies
FROM oven/bun:1 AS base

# Skip browser download since Playwright handles that in the final stage
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /usr/src/app

# Copy necessary files for dependency installation
COPY ./package.json bun.lockb ./

# Install production dependencies only
RUN bun install --production --frozen-lockfile

# Stage 2: Use Playwright image, but copy Bun runtime and dependencies from the previous stage
FROM apify/actor-node-playwright:22-1.45.2 AS playwright


# Copy the Bun runtime from the first stage
COPY --from=base --chown=myuser /usr/local/bin/bun /usr/local/bin/bun
COPY --from=base --chown=myuser /root/.bun /root/.bun

ENV PATH="/root/.bun/bin:$PATH"

# Copy the node_modules and other files from the Bun build stage
COPY --from=base --chown=myuser /usr/src/app/node_modules ./node_modules
COPY --from=base --chown=myuser /usr/src/app/package.json ./

# Copy the application files
COPY . .

# Command to start the application with Bun
CMD ./start_xvfb_and_run_cmd.sh && bun run index.ts

