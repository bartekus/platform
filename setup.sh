#!/bin/bash

brew install encoredev/tap/encore
brew install mkcert
brew install nss # if you use Firefox
brew install stripe/stripe-cli/stripe
mkcert -install
npm install --global corepack@latest

# .env.example file at the root
ENV_EXAMPLE_FILE="${PWD}/.env.example"
ENV_FILE="${PWD}/.env"

if [ ! -f $ENV_FILE ]; then
    cp $ENV_EXAMPLE_FILE $ENV_FILE
    echo ".env file created from .env.example"
else
    echo ".env file already exists"
fi

# Load environment variables from .env
set -a # automatically export all variables
source $ENV_FILE
set +a

if [ $DOMAIN ]; then
    cd ./infra/docker/ingress/ssl && \
    mkcert  "*.${DOMAIN}" && \
    cd - || exit

    ./scripts/create-etc-hosts-entry.sh "traefik.${DOMAIN}"
    ./scripts/create-etc-hosts-entry.sh "whoami.${DOMAIN}"
    ./scripts/create-etc-hosts-entry.sh "pgweb.${DOMAIN}"
    ./scripts/create-etc-hosts-entry.sh "logto.${DOMAIN}"
    ./scripts/create-etc-hosts-entry.sh "logto-admin.${DOMAIN}"
    ./scripts/create-etc-hosts-entry.sh "api.${DOMAIN}"
else
    echo ".env doesnt contain DOMAIN"
    exit 1
fi

if ( [ $APP_NAME ] && [ $DOMAIN ] ) ; then
    ./scripts/create-etc-hosts-entry.sh "${APP_NAME}.${DOMAIN}"
else
    echo ".env doesnt contain APP_NAME && DOMAIN"
    exit 1
fi
