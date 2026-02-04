# n8n Custom Dockerfile
FROM n8nio/n8n:latest AS base

# Copy custom settings and workflows
COPY --chown=node:node environment-variables.sh /home/node/.n8n/environment-variables.sh
COPY --chown=node:node n8n-workflow.json /home/node/.n8n/
COPY --chown=node:node n8n-credentials.json /home/node/.n8n/

# Set working directory
WORKDIR /home/node/.n8n

EXPOSE 5678

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5678/healthz || exit 1

CMD ["tini", "--", "n8n"]
