# AEBS Simulator — image statis, tanpa build step
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="AEBS Simulator" \
      org.opencontainers.image.description="Simulasi AEB dump truck tambang (static site)" \
      org.opencontainers.image.source="https://github.com/adiyasa15/AEBS-Simulator"

COPY deploy/nginx-aebs.conf /etc/nginx/conf.d/default.conf
COPY index.html style.css /usr/share/nginx/html/
COPY js/ /usr/share/nginx/html/js/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
