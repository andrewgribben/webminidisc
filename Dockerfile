FROM node:22-bookworm AS build

WORKDIR /src

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        g++ \
        git \
        libusb-1.0-0-dev \
        make \
        pkg-config \
        python3 \
    && rm -rf /var/lib/apt/lists/* \
    && git config --global url."https://github.com/".insteadOf "ssh://git@github.com/" \
    && git config --global url."https://github.com/".insteadOf "git@github.com:"

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN git config --global --add safe.directory /src \
    && CI=false PUBLIC_URL=./ HUSKY=0 npm run build

FROM alpine:3.21

RUN apk add --no-cache nginx openssl tini \
    && mkdir -p /var/log/nginx /var/lib/nginx/tmp /run/nginx \
    && rm -f /etc/nginx/http.d/default.conf

COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY --from=build /src/dist /usr/share/nginx/html

EXPOSE 8474

ENTRYPOINT ["/sbin/tini", "-g", "--", "/entrypoint.sh"]
