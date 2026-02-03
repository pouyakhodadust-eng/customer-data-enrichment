#!/bin/bash
# Deployment Script for Customer Data Enrichment Engine
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Customer Data Enrichment Engine - Deployment Script"
echo "========================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo ""
echo "📋 Checking prerequisites..."

command -v docker >/dev/null 2>&1 || { print_error "Docker is not installed"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { print_error "Docker Compose is not installed"; exit 1; }
print_status "Docker and Docker Compose are available"

# Check if .env file exists
if [ ! -f "$PROJECT_DIR/.env" ]; then
    print_warning ".env file not found. Creating from template..."
    cat > "$PROJECT_DIR/.env" << EOF
# Database Configuration
POSTGRES_USER=enrichment_user
POSTGRES_PASSWORD=secure_password_change_in_production
POSTGRES_DB=enrichment_db

# API Configuration
API_PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=production

# Enrichment API Keys (fill in your keys)
CLEARBIT_KEY=
HUNTER_KEY=
FULLCONTACT_KEY=

# Frontend Configuration
FRONTEND_PORT=8080

# n8n Configuration
N8N_USER=admin
N8N_PASSWORD=change_password_in_production
N8N_ENCRYPTION_KEY=your-32-char-encryption-key-here32
N8N_WEBHOOK_URL=http://localhost:5678/

# Grafana Configuration
GRAFANA_USER=admin
GRAFANA_PASSWORD=change_password_in_production

# Logging
LOG_LEVEL=info
EOF
    print_status "Created .env file - please update with your credentials"
else
    print_status ".env file exists"
fi

# Build and start services
echo ""
echo "🔨 Building and starting services..."

cd "$PROJECT_DIR"

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Build images
echo "Building Docker images..."
docker-compose build --no-cache

# Start services
echo "Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy..."

# Function to check service health
check_service() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps "$service" | grep -q "(healthy)"; then
            print_status "$service is healthy"
            return 0
        fi
        echo "  Waiting for $service... ($attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    print_error "$service failed to become healthy"
    return 1
}

# Check all services
services=("postgres" "redis" "api" "frontend" "n8n" "prometheus" "grafana")
for service in "${services[@]}"; do
    check_service "$service" || true
done

# Run database migrations
echo ""
echo "🗄️ Running database migrations..."
docker-compose exec -T api npm run migrate 2>/dev/null || print_warning "Migration skipped (may already be applied)"

# Run database seeds
echo ""
echo "🌱 Seeding database..."
docker-compose exec -T api npm run seed 2>/dev/null || print_warning "Seed skipped"

# Display service status
echo ""
echo "📊 Service Status:"
echo "=================="
docker-compose ps

echo ""
echo "🎉 Deployment Complete!"
echo "========================"
echo ""
echo "📝 Access Points:"
echo "  • API:          http://localhost:${API_PORT:-3000}"
echo "  • Frontend:     http://localhost:${FRONTEND_PORT:-8080}"
echo "  • n8n:          http://localhost:5678"
echo "  • Prometheus:   http://localhost:9090"
echo "  • Grafana:      http://localhost:3000"
echo ""
echo "🔐 Default Credentials:"
echo "  • API:          Use JWT tokens"
echo "  • n8n:          admin / (set in .env)"
echo "  • Grafana:      admin / (set in .env)"
echo ""
echo "📖 Documentation: See README.md"
