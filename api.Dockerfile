FROM node:23-alpine
WORKDIR /app
COPY . .
RUN npm ci

USER node
EXPOSE 8080
CMD ["npm", "-w", "@nillion/api", "start"]
