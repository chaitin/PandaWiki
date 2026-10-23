FROM nginx:alpine
COPY dist /opt/frontend/dist
COPY server.conf /etc/nginx/conf.d/server.conf
COPY nginx.conf /etc/nginx/nginx.conf
COPY ssl /etc/nginx/ssl
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]