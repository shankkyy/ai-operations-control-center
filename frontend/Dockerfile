FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Vite inlines VITE_* vars at build time, not container start time, so this
# must be a build ARG (set from docker-compose's build.args), not just ENV at runtime.
ARG VITE_API_URL=http://localhost:3001/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

EXPOSE 5173
CMD ["npm", "run", "preview"]
