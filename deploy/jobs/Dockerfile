FROM node:22.18-alpine3.21 AS build

WORKDIR /app

COPY ./create-test-accounts.js ./
COPY ./test-accounts-config.json ./

CMD ["node", "create-test-accounts.js"]