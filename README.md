# Maka Backend

The backend API powering **Maka**, a lightweight e-commerce platform designed to help merchants manage and grow their online businesses.

Maka aims to help merchants move through a continuous cycle:

**Sell → Observe → Understand → Improve → Sell more.**

This repository contains the server-side application, business logic, data persistence and supporting services.

## Tech Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Backend framework:** Express 5
- **Database:** PostgreSQL
- **Query builder:** Knex.js
- **Testing:** Vitest
- **Image processing:** Sharp
- **Object storage:** Cloudflare R2 (AWS S3-compatible API)
- **Authentication:** Phone number verification with OTP
- **Messaging:** WhatsApp integration through Genuka

## Architecture

The backend follows a layered architecture with separation of responsibilities.

```text
HTTP Request
     |
     v
Routes
     |
     v
Controllers
     |
     v
Services
     |
     v
Repositories
     |
     v
PostgreSQL
```

The application uses dependency composition to instantiate and connect its components.

### Project Structure

```text
src/
├── common/
│   ├── errors/
│   ├── http/
│   │   ├── routes/
│   │   └── validation/
│   └── middlewares/
├── composition/
├── config/
├── controllers/
├── database/
│   ├── migrations/
│   └── repositories/
├── image-processing/
├── insights/
│   └── rules/
├── notifications/
│   ├── config/
│   ├── factories/
│   ├── providers/
│   └── types/
├── services/
├── storage/
└── server.ts
```

## Features

The backend currently includes the following capabilities:

- **Authentication:** phone number verification using one-time passwords (OTP).
- **Session management:** session-based identity management.
- **User management:** user profile retrieval and updates.
- **Store management:** store creation, retrieval, updates and activation controls.
- **Product management:** product creation, retrieval, updates, availability management and archiving.
- **Product images:** image uploads, processing and storage.
- **Shopping cart:** session-based cart management.
- **Orders:** order creation, retrieval and seller-side status updates.
- **Categories:** category retrieval and administration.
- **Notifications:** notification management and background delivery workers.
- **Events and insights:** event recording and business insight calculation.

Some integrations and workflows are still being developed.

## API Overview

All application endpoints use the `/api/v1` prefix.

| Resource       | Main endpoints                                    |
| -------------- | ------------------------------------------------- |
| Authentication | `POST /auth/otp/request`, `POST /auth/otp/verify` |
| Users          | `/users`                                          |
| Stores         | `/stores`                                         |
| Products       | `/products`                                       |
| Product images | `/products/:productId/images`                     |
| Cart           | `/cart`                                           |
| Orders         | `/orders`                                         |
| Categories     | `/categories`                                     |
| Events         | `/events`                                         |
| Notifications  | `/notifications`                                  |

Health check:

```http
GET /api/health
```

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL
- npm
- A configured Cloudflare R2 bucket for image storage
- Genuka WhatsApp credentials for WhatsApp OTP delivery

### Installation

Clone the repository:

```bash
git clone https://github.com/espada5376/maka-backend.git
cd maka-backend
```

Install dependencies:

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root.

The application uses the following environment configuration:

```env
NODE_ENV=development
PORT=5000

FRONTEND_URL=http://localhost:5173

DATABASE_URL=
DB_HOST=localhost
DB_PORT=5432
DB_NAME=maka
DB_USER=
DB_PASSWORD=

ADMIN_API_KEY=

OTP_HASH_SECRET=
OTP_ENCRYPTION_KEY=

GENUKA_WA_API_KEY=
GENUKA_WA_BASE_URL=
GENUKA_WA_CONNECTION_ID=
```

Use the database connection configuration supported by the application. Do not commit credentials or secret keys to version control.

Cloudflare R2 credentials must also be configured according to the storage configuration.

### Database Migrations

Run the database migrations:

```bash
npm run migrate
```

### Run the Development Server

```bash
npm run dev
```

The API will run on the configured port (5000 by default).

### Build for Production

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Test database configuration can be provided separately using the `TEST_DB_*` environment variables where required by the test setup.

## Current Development Status

Maka is an actively developed project.

The backend is being built incrementally, with an emphasis on:

- Clear separation of concerns.
- Maintainable TypeScript code.
- Consistent API contracts.
- Session and identity management.
- Reliable data persistence.
- Automated testing.

## Related Repository

The frontend application is available here:

[Maka Frontend](https://github.com/espada5376/maka-frontend)

## License

This repository declares the ISC license.
