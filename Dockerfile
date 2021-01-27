FROM node:alpine AS base
RUN apk update && apk upgrade && apk add --no-cache \
  git \
  python \
  build-base \
  make \
  libtool \
  autoconf \
  automake \
  ffmpeg
RUN npm install -g node-gyp

FROM Base AS dev
WORKDIR /usr/app
COPY package* ./
# RUN npm install --production && cp -r node_modules /tmp/node_modules
RUN npm install
COPY . .
RUN npm run clean
RUN npm run build

# FROM Base AS prod
# WORKDIR /usr/app
# COPY --from=dev /usr/app/dist ./dist
# COPY --from=dev /tmp/node_modules ./node_modules
# COPY package* ./
# COPY .env* ./
CMD [ "npm", "start"]
