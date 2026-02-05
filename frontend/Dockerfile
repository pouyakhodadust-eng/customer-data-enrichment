# Frontend Dockerfile - Static HTML serving
FROM nginx:alpine AS production

# Copy nginx configuration
COPY config/nginx.conf /etc/nginx/nginx.conf

# Copy all frontend assets
COPY index.html login.html styles.css dashboard.js leads.js enrichment.js settings.js app.js api.js config.js /usr/share/nginx/html/

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
