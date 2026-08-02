# ──── Build stage ────
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG API_BASE
ARG GOOGLE_CLIENT_ID
ENV API_BASE=${API_BASE}
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}

RUN npm run build

# ──── Production stage ────
FROM node:20-alpine AS production
WORKDIR /app

# Copy only the Nuxt server output
COPY --from=build /app/.output .output

# Nuxt 3 uses NITRO_PORT / PORT for the listening port
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
