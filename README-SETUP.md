# Setup local (sin Docker)

```bash
npm install
cp .env.example .env
# Edita .env con tus connection strings de Neon (pooled + directa)

npx prisma generate
npx prisma migrate dev --name init

npm run start:dev
```

La API queda en `http://localhost:3000/api`.
Prueba: `POST http://localhost:3000/api/contacts` con body `{ "firstName": "Ana", "email": "ana@test.com" }`

# Setup con Docker (recomendado) — Postgres y Redis 100% locales

En desarrollo **no se toca Neon para nada**. `docker-compose.yml` levanta:
- `postgres`: Postgres 16 local, con datos persistidos en un volumen de Docker.
- `redis`: para BullMQ (workflows).
- `backend`: tu API NestJS con hot reload.

```bash
cp .env.example .env
docker compose up --build
```

Correr las migraciones (crea las tablas en el Postgres local):
```bash
docker compose exec backend npx prisma migrate dev --name init
```

La API queda en `http://localhost:3000/api`.
Prueba: `POST http://localhost:3000/api/contacts` con body `{ "firstName": "Ana", "email": "ana@test.com" }`

Otros comandos útiles:
```bash
# Shell dentro del contenedor
docker compose exec backend sh

# Ver los datos con Prisma Studio (abre en localhost:5555)
docker compose exec backend npx prisma studio

# Resetear la base de datos local por completo
docker compose down -v   # -v borra también el volumen de datos
```

# Setup local sin Docker

Necesitas un Postgres corriendo en tu máquina (o usa solo `docker compose up postgres redis` para tener las dependencias y correr el backend fuera de Docker).

```bash
npm install
cp .env.example .env   # ya apunta a localhost:5432 por defecto

npx prisma generate
npx prisma migrate dev --name init

npm run start:dev
```

# Deploy a producción (Neon)

Aquí es donde Neon entra en juego — solo para producción/staging:

```bash
cp .env.production.example .env.production
# Completa DATABASE_URL / DIRECT_URL con las connection strings de tu proyecto en Neon

# Aplica las migraciones ya probadas en local contra Neon
npx prisma migrate deploy
```

`migrate deploy` (a diferencia de `migrate dev`) no crea shadow database ni pide confirmaciones — solo aplica las migraciones pendientes, ideal para CI/CD.
