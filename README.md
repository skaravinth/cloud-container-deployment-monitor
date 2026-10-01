# Cloud Container Deployment Monitor

An operations dashboard for managing containerized applications and observing deployments, resource usage, alerts, and infrastructure health.

This project combines a React dashboard, Express API, MongoDB persistence, Docker Compose services, Kubernetes reference manifests, and Prometheus-compatible metrics.

## Features

- React operations dashboard for applications, deployments, metrics, alerts, logs, and infrastructure
- JWT registration and login with bcrypt password hashing
- MongoDB persistence through Mongoose models
- Application creation, deployment queuing, deletion, and alert acknowledgement
- Seed data for applications, deployments, metrics, and alerts
- Docker Compose stack for MongoDB, API, dashboard, Prometheus, and Grafana
- Kubernetes reference manifest for the API and MongoDB
- Prometheus `/metrics` endpoint and `/health` readiness endpoint
- Responsive dashboard layout for desktop and mobile screens

## Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite, Recharts, Lucide React |
| Backend | Node.js 22, Express 5 |
| Database | MongoDB 8, Mongoose 8 |
| Authentication | JWT, bcryptjs |
| Containerization | Docker, Docker Compose, Nginx |
| Orchestration | Kubernetes manifests |
| Monitoring | Prometheus, Grafana, prom-client |
| Cloud target | AWS, Azure, or Google Cloud Kubernetes environments |

## Architecture

```text
React dashboard
      |
      v
Node.js + Express API ---- Prometheus
      |
      v
MongoDB                 Grafana
      |
      v
Applications, deployments, metrics, and alerts
```

The current API creates deployment records with `queued` status. A Kubernetes controller or worker is still required to execute real cluster rollouts and collect live container logs and resource metrics.

## Prerequisites

For local development:

- Node.js 22 or newer
- npm 10 or newer
- MongoDB 8, either installed locally or started through Docker
- Git

For the container stack:

- Docker Desktop with Docker Compose

For Kubernetes deployment:

- A Kubernetes cluster
- `kubectl` configured for the target cluster
- A container registry such as GitHub Container Registry, Amazon ECR, Azure Container Registry, or Google Artifact Registry
- A configured storage class for MongoDB persistence

## Quick Start With Local MongoDB

1. Install dependencies:

   ```powershell
   npm install
   npm install --prefix client
   npm install --prefix server
   ```

2. Create a local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Set a private `JWT_SECRET` in `.env`. The default MongoDB URI is:

   ```text
   mongodb://localhost:27017/deployment_monitor
   ```

4. Seed demonstration records:

   ```powershell
   npm run seed
   ```

5. Start the API and dashboard:

   ```powershell
   npm run dev
   ```

6. Open the dashboard at http://localhost:5173.

The API is available at http://localhost:4000. Check its connection with:

```powershell
Invoke-RestMethod http://localhost:4000/health
```

## Run With Docker Compose

1. Create `.env` and set secure values:

   ```env
   JWT_SECRET=replace-with-a-long-random-secret
   GRAFANA_PASSWORD=replace-with-a-secure-password
   ```

2. Build and start the complete stack:

   ```powershell
   docker compose up --build
   ```

3. Open the services:

| Service | URL |
| --- | --- |
| Dashboard | http://localhost:5173 |
| API | http://localhost:4000 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 |
| MongoDB | `mongodb://localhost:27017` |

To stop the stack:

```powershell
docker compose down
```

To remove persisted local data as well:

```powershell
docker compose down -v
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | API port. Defaults to `4000`. |
| `MONGODB_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Secret used to sign authentication tokens. |
| `CLIENT_ORIGIN` | No | Allowed dashboard origin. |
| `GRAFANA_PASSWORD` | Compose only | Initial Grafana admin password. |

Never commit `.env` or production secrets. Use GitHub Actions secrets, Kubernetes Secrets, or a cloud secret manager for deployed environments.

## API Endpoints

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`

### Applications and deployments

- `GET /api/overview`
- `GET /api/applications`
- `POST /api/applications`
- `PATCH /api/applications/:id`
- `DELETE /api/applications/:id`
- `POST /api/applications/:id/deployments`

Application and deployment mutations require `Authorization: Bearer <token>`.

### Operations

- `PATCH /api/alerts/:id`
- `GET /health`
- `GET /metrics`

## Data Models

MongoDB stores the following collections:

- `users`: name, email, password hash, and role
- `applications`: repository, image, environment, replicas, cluster, and status
- `deployments`: application, image, Kubernetes configuration, replicas, and status
- `metrics`: CPU, memory, network, container status, restarts, and timestamps
- `alerts`: type, message, threshold, trigger time, and status

## Kubernetes Reference Deployment

The starting manifest is in `k8s/platform.yaml`. Before applying it:

1. Build and publish the API image.
2. Replace `ghcr.io/your-org/deployment-monitor-api:latest` with your image.
3. Create the namespace and application secret:

   ```powershell
   kubectl create namespace deployment-monitor
   kubectl -n deployment-monitor create secret generic platform-secrets `
     --from-literal=jwt-secret="replace-with-a-secure-secret"
   ```

4. Confirm the storage class and resource limits for your cluster.
5. Apply the manifest:

   ```powershell
   kubectl apply -f k8s/platform.yaml
   ```

This manifest is a reference starting point, not a production-hardened MongoDB or observability installation. Prometheus and Grafana should be installed with an established Kubernetes monitoring chart for production clusters.

## Validation

Build the frontend:

```powershell
npm run build
```

Check the API syntax:

```powershell
node --check server/src/index.js
```

## Project Structure

```text
client/                 React/Vite dashboard and Nginx image
server/src/             Express API, Mongoose models, and seed script
k8s/                    Kubernetes reference manifest
monitoring/             Prometheus configuration
docker-compose.yml      Local multi-service environment
.env.example            Environment variable template
```

## Current Scope and Roadmap

The repository provides a working full-stack foundation and local monitoring workflow. The following production capabilities are next-stage work:

- Execute Kubernetes rollouts instead of only queuing deployment records
- Build and publish images from connected Git repositories
- Collect live Kubernetes logs and container resource metrics
- Add Grafana datasource and dashboard provisioning
- Add Terraform modules for AWS, Azure, and Google Cloud
- Add GitHub Actions CI/CD workflows
- Add rate limiting, strict request schemas, RBAC enforcement, audit logging, TLS, and production secret management

## License

No license has been selected yet. Add a license before distributing this project publicly.
