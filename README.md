## Requirements

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [Yarn](https://yarnpkg.com/) package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bitnimble/paradb.git
   cd paradb
   ```

2. **Create environment file**
   ```bash
   cp .env.sample .env
   ```
   Then edit the `.env` file with your specific configuration values.

3. **Start the development environment**
   ```bash
   yarn dev
   ```
   
   Alternatively, you can use Docker Compose directly:
   ```bash
   docker compose -f docker/docker-compose.dev.yml --env-file .env up
   # or in detached mode
   docker compose -f docker/docker-compose.dev.yml --env-file .env up -d
   ```

The application will be available at http://localhost:3000 once all services are running.
