#!/bin/bash
# n8n Environment Variables Configuration
# This file sets environment variables for n8n at startup

# General n8n settings
export N8N_HOST="0.0.0.0"
export N8N_PORT="5678"
export N8N_PROTOCOL="http"
export WEBHOOK_URL="http://localhost:5678/"

# Security
export N8N_BASIC_ACTIVE=true

# Database (external PostgreSQL for production)
# export DB_TYPE="postgresdb"
# export DB_POSTGRESDB_HOST="postgres"
# export DB_POSTGRESDB_PORT="5432"
# export DB_POSTGRESDB_DATABASE="n8n"
# export DB_POSTGRESDB_USER="n8n"
# export DB_POSTGRESDB_PASSWORD="${POSTGRES_PASSWORD}"

# Encryption key for credentials
# export N8N_ENCRYPTION_KEY="${ENCRYPTION_KEY}"

# Execution settings
export EXECUTIONS_DATA_SAVE_ON_ERROR=all
export EXECUTIONS_DATA_SAVE_ON_SUCCESS=all

# Disable telemetry
export N8N_TELEMETRY_DISABLED=true

# n8n-nodes-chatwork settings
# export CHATWORK_API_TOKEN="${CHATWORK_API_TOKEN}"

# n8n-nodes-slack settings
# export SLACK_ACCESS_TOKEN="${SLACK_ACCESS_TOKEN}"
# export SLACK_SIGNING_SECRET="${SLACK_SIGNING_SECRET}"

echo "n8n environment variables loaded"
