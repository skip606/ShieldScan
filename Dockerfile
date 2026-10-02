# ShieldScan: static site served by nginx
# Stage 1: collect only the files the site needs
FROM alpine:3.20 AS site
WORKDIR /site
COPY index.html shieldscan.html ./

# Stage 2: runtime
FROM nginx:1.27-alpine

# Replace the stock config (port 80) and default html
RUN rm -f /etc/nginx/conf.d/*.conf && rm -rf /usr/share/nginx/html/*
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=site /site/ /usr/share/nginx/html/

# Platform injects PORT (always 8080). Fallback only if it's missing.
EXPOSE 8080

# Long-running server in the foreground, bound to 0.0.0.0:$PORT
CMD ["/bin/sh", "-c", "sed -i \"s/__PORT__/${PORT:-8080}/g\" /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
