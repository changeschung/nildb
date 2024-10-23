FROM oven/bun:1
WORKDIR /usr/src/app
COPY . .
RUN LEFTHOOK=0 bun install --frozen-lockfile
USER bun
ENTRYPOINT [ "bun", "--filter", "@nillion/api", "start" ]
