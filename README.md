# Maka Backend

**The REST API powering Maka, a lightweight e-commerce platform designed for merchants.**

Maka is a project focused on helping merchants showcase their products, manage their stores, and handle customer orders through a simple digital commerce experience.

This repository contains the backend application responsible for business logic, data persistence, authentication, and API communication.

> **Project status:** Under active development.

## Overview

Maka Backend is a RESTful API built with Node.js, Express, and TypeScript.

It follows a modular architecture that separates HTTP handling, business logic, and database access.

## Features

- User authentication using WhatsApp OTP.
- Session-based identity management.
- User profile management.
- Store creation and management.
- Product and product image management.
- Shopping cart management.
- PostgreSQL database integration.
- Image processing and object storage integration.
- Input validation and error handling.
- Automated backend tests.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express 5 | HTTP server and routing |
| TypeScript | Static typing |
| PostgreSQL | Relational database |
| Knex.js | SQL query builder and migrations |
| Vitest | Automated testing |
| Zod | Data validation |
| Sharp | Image processing |
| Cloudflare R2 | Object storage (S3-compatible API) |

## Architecture

The backend follows a layered architecture:

```text
Client
  |
  v
Express Routes
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

- **Routes:** Define API endpoints and middleware.
- **Controllers:** Handle HTTP requests and responses.
- **Services:** Implement application business logic.
- **Repositories:** Handle database operations.

This separation improves maintainability, testability, and code organization.

## Getting Started

### Prerequisites

- Node.js (24 or later recommended)
- npm
- PostgreSQL
- Git

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

### Environment Configuration

Create a `.env` file in the project root.

Configure the required environment variables for:

- Application environment.
- Server port.
- PostgreSQL connection.
- Frontend origin (CORS).
- Authentication and OTP security.
- WhatsApp OTP delivery.
- Object storage credentials.

**Important:** Never commit your `.env` file or expose credentials in the repository.

### Database Migrations

After configuring PostgreSQL and the environment variables, run:

```bash
npm run migrate
```

### Development

Start the development server:

```bash
npm run dev
```

### Production Build

Compile the TypeScript application:

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

## API

The API is versioned under:

```text
/api/v1
```

The backend exposes resources for users, authentication, stores, products, and shopping carts.

The frontend repository is available at:

https://github.com/espada5376/maka-frontend

## Project Goals

Maka aims to provide a lightweight commerce infrastructure that helps merchants:

1. Showcase their products.
2. Manage their online stores.
3. Receive and manage customer orders.
4. Better understand their business activity.

## Author

**Ezéchiel SEDAH**

Full Stack Developer

GitHub: https://github.com/espada5376

## License

The project is currently under development. License and contribution terms will be specified separately.
