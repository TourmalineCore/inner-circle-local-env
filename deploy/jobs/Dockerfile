FROM node:22.18-alpine3.21 AS build

WORKDIR /app

COPY deploy/jobs/create-test-accounts.js ./
COPY deploy/jobs/test-accounts-config.json ./

CMD ["node", "create-test-accounts.js"]