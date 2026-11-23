# Build a partir da RAIZ do repo (o front importa ../dados/base_sintetica.json):
#   docker build -f web/Dockerfile -t bariatrica-web .
FROM node:22-alpine AS build
WORKDIR /app
COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci
COPY web ./web
# só os JSONs sem identificadores; nunca copiar identificadores_RESTRITO.csv
COPY dados/base_sintetica.json dados/modelo_previsao.json ./dados/
RUN cd web && npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/web/dist /usr/share/nginx/html
EXPOSE 80
