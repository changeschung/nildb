FROM node:23-alpine

RUN corepack enable pnpm && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY . .
RUN LEFTHOOK=0 pnpm install --frozen-lockfile --prod

USER node
EXPOSE 8080
ENTRYPOINT [ "pnpm", "run", "start" ]
