FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/services/timeline/prompt.md ./dist/services/timeline/
COPY --from=build /app/src/services/tts/proto ./dist/services/tts/proto

RUN mkdir -p logs && chown node:node logs
USER node

EXPOSE 3000
CMD ["node", "dist/server.js"]
