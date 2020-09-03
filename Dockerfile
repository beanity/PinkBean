FROM node:lts-alpine
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
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD [ "npm", "start"]
