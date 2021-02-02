# Pink Bean

A MapleStory discord bot.

## Getting Started

### Clone the repo

```bash
git clone https://github.com/beanity/pinkbean.git
```
### Set up the configs

Configs are store in the [config](config) folder, which is based on the [default.yml](config/default.yml) file. 

For local development, create a `development.yml` file and store your development configs there.

For production, create a `production.yml` file and store your production configs there.

The `.env` is only used for storing database password, which is used by the [docker-compose.yml](docker-compose.yml) file.

### Build the app

```bash
npm i
docker-compose build
npm run build
```

### Database migration

```bash
npx typeorm migration:run
```

### Running locally (development)

```bash
docker-compose up
```

### Running in production

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```