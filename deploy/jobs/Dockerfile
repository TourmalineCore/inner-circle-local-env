FROM node:24.20.0-alpine3.23 AS build

WORKDIR /app

COPY ./create-test-accounts.js ./
COPY ./test-accounts-config.json ./

CMD ["node", "create-test-accounts.js"]