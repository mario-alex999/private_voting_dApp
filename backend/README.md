# Private Voting Backend

Express + MongoDB backend extracted from the provided `Private voting backend` package and integrated with this dApp.

## Endpoints

- `GET /api/health`
- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/users/me` (JWT)
- `POST /api/users/vote` (JWT)

## Run locally

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
