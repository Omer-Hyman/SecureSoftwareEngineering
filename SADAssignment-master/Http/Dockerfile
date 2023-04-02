# stage1 as builder
FROM node:18.7.0-alpine as builder

WORKDIR /src/frontend

# Copy the package.json and install dependencies
COPY frontend/package*.json .
RUN npm install

# Copy rest of the files
COPY frontend/. .

# Build the project
RUN npm run build

FROM nginx

COPY ["nginx-selfsigned.crt", "/etc/nginx/certs/nginx-selfsigned.crt"]
COPY ["nginx-selfsigned.key", "/etc/nginx/certs/nginx-selfsigned.key"]
COPY ["nginx.conf", "/etc/nginx/nginx.conf"]
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /src/frontend/build /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]