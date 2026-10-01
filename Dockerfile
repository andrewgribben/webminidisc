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

# Pin Downtify 3.1.0. Do not float :latest; the port 4534 app is updated on its own.
FROM henriquesebastiao/downtify@sha256:fa1ec39be35b8de29c9ca257631710beaec0cd51908b39ec2bb49b998e3d6a08

USER root

RUN apk add --no-cache ca-certificates nginx openssl \
    && mkdir -p /var/log/nginx /var/lib/nginx/tmp /run/nginx /usr/share/licenses/downtify /usr/share/licenses/md-library /md-library-data \
    && rm -f /etc/nginx/http.d/default.conf \
    && python -c "import urllib.request; urllib.request.urlretrieve('https://raw.githubusercontent.com/henriquesebastiao/downtify/main/LICENSE', '/usr/share/licenses/downtify/LICENSE')"

COPY docker/downtify-NOTICE /usr/share/licenses/downtify/NOTICE
COPY docker/md-library/NOTICE /usr/share/licenses/md-library/NOTICE
COPY docker/md-library/requirements.txt /tmp/md-library-requirements.txt
RUN apk add --no-cache --virtual .md-build gcc g++ musl-dev \
    && python -m ensurepip --upgrade \
    && python -m venv /md-library/.venv \
    && /md-library/.venv/bin/pip install --no-cache-dir -r /tmp/md-library-requirements.txt \
    && apk del .md-build \
    && rm -f /tmp/md-library-requirements.txt \
    && python -m pip uninstall -y pip \
    && rm -rf /root/.cache/pip /md-library/.venv/bin/pip* /md-library/.venv/lib/python*/site-packages/pip*

COPY docker/md-library/app /md-library/app
COPY docker/nginx.conf /etc/nginx/http.d/default.conf.template
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY --from=build /src/dist /usr/share/nginx/html

EXPOSE 8474

ENTRYPOINT ["/sbin/tini", "-g", "--", "/entrypoint.sh"]
