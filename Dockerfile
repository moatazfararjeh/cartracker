# Car Care web build: export the Expo app as a static SPA, serve it with nginx.

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app

# EXPO_PUBLIC_* values are inlined into the JS bundle at build time,
# so they must be provided as build arguments (Coolify: mark them "Build Variable").
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL \
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    CI=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN test -n "$EXPO_PUBLIC_SUPABASE_URL" && test -n "$EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
    || (echo "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY as build variables" && exit 1)
RUN npx expo export --platform web --output-dir dist

# ---- serve ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
