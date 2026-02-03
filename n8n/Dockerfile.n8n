# n8n Custom Dockerfile
FROM n8nio/n8n:latest-alpine AS base

# Install additional dependencies
USER root

# Install Python and build tools for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc-dev \
    && pip3 install --no-cache-dir \
    pandas \
    numpy

# Install specific n8n-community nodes
RUN n8n generate-robots-txt && \
    npm install -g n8n-nodes-chatwork \
    n8n-nodes-slack \
    n8n-nodesDISCORD

# Switch back to n8n user
USER node

# Copy custom settings
COPY --chown=node:node n8n/environment-variables.sh /home/node/.n8n/environment-variables.sh

# Set working directory
WORKDIR /home/node/.n8n

EXPOSE 5678

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5678/healthz || exit 1

CMD ["tini", "--", "n8n"]
