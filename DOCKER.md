# Docker Setup for Calculator AI

## Quick Start

1. **Configure environment variables:**
   Edit `.env` file with your actual values:
   ```bash
   # PostgreSQL credentials
   POSTGRES_USER=your_db_user
   POSTGRES_PASSWORD=your_secure_password
   POSTGRES_DB=calculator_db

   # API credentials
   API_KEY=your_openrouter_api_key
   MODEL=qwen-plus

   # Database connection
   DB_HOST=postgres
   DB_PORT=5432
   DB_USER=your_db_user
   DB_PASSWORD=your_secure_password
   DB_NAME=calculator_db
   ```

2. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:8888
   - PostgreSQL: localhost:5432

## Services

- **postgres** - PostgreSQL 16 database
- **frontend** - SvelteKit static build (nginx)
- **backend** - C++ backend with manapihttp

## Database Schema

The `chats` table is automatically created with the following structure:
```sql
CREATE TABLE chats (
    id VARCHAR(78) NOT NULL,
    chat TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    removed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 0
);
```

## Stopping Services

```bash
docker-compose down
```

To remove all data:
```bash
docker-compose down -v
```
