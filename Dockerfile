# Topside: tiny Node server (zero dependencies) that serves the app and
# wires the platform's managed payments. META_API_URL and META_APP_TOKEN are
# injected by the platform at deploy time and stay server-side.
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY server.js pricing.html index.html ./
USER node

# Platform injects PORT (always 8080). Fallback only if it's missing.
EXPOSE 8080

# Long-running server in the foreground, bound to 0.0.0.0:$PORT, logs to stdout/stderr
CMD ["node", "server.js"]
