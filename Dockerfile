FROM node:12 as builder

ARG BUILD_ENV
ARG VERSION
ENV ___BUILD___="${BUILD_ENV}_${VERSION}"

ADD . /vanilla
WORKDIR /vanilla

RUN rm -rf node_modules && \
    rm -f log/*.log && \
    cp config/${BUILD_ENV}.json ./config.json && \
    npm install && \
    ./node_modules/.bin/webpack --config config.js && \
    ./write_hash.sh

FROM scratch

COPY --from=builder /vanilla /var/www/vanilla
VOLUME /var/www/vanilla
