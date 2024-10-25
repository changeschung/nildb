FROM node:23-alpine

WORKDIR /app
COPY . .
RUN LEFTHOOK=0 pnpm install

USER node
EXPOSE 8080
ENTRYPOINT [ "pnpm", "run", "start" ]
