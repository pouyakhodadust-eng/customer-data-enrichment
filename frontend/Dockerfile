# Frontend Dockerfile - Static HTML serving
FROM nginx:alpine AS production

# Copy nginx configuration
COPY config/nginx.conf /etc/nginx/nginx.conf

# Copy built assets
COPY index.html styles.css dashboard.js leads.js config.js /usr/share/nginx/html/

# Copy any additional assets
COPY assets/ /usr/share/nginx/html/assets/ 2>/dev/null || true

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
