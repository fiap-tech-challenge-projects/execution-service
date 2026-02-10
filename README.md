# Execution Service

Service Execution Management Microservice for FIAP Tech Challenge Phase 4.

## Overview

The Execution Service manages the execution phase of service orders. It tracks execution progress, manages tasks, and handles completion workflows. It uses DocumentDB (MongoDB-compatible) for NoSQL data storage and communicates asynchronously via EventBridge/SQS.

## Responsibilities

- Execution tracking and status management
- Task management within executions
- Technician assignment and scheduling
- Execution completion and invoicing trigger
- Event publishing for execution lifecycle
- Execution history and reporting

## Architecture

Built with **Domain-Driven Design (DDD)** principles using **DocumentDB** (MongoDB) for NoSQL storage:

```
src/
├── domain/                # Core business logic
│   ├── executions/        # Execution aggregate
│   └── shared/            # Value objects (ExecutionStatus, TaskStatus)
├── application/           # Use cases
│   ├── executions/        # Execution use cases
│   └── events/            # Event publishers/consumers
├── infra/                 # Infrastructure
│   ├── database/          # MongoDB/DocumentDB repositories
│   └── messaging/         # EventBridge/SQS
├── interfaces/            # HTTP layer
│   └── rest/              # Controllers
└── shared/                # Cross-cutting concerns
```

## Technology Stack

- **Runtime**: Node.js 20 + TypeScript 5
- **Framework**: NestJS 11
- **Database**: DocumentDB (MongoDB 5.0 compatible)
- **ODM**: Mongoose 8
- **Messaging**: AWS EventBridge + SQS
- **Deployment**: Kubernetes (EKS)
- **Architecture**: Domain-Driven Design

## Domain Entities

### Execution (Aggregate Root)
Represents the execution of a service order.

**Properties**: Service Order ID, Budget ID, Technician ID, Status, Start Date, End Date, Tasks, Notes

**Status Flow**: SCHEDULED → IN_PROGRESS → PAUSED → COMPLETED → INVOICED

### ExecutionTask
Individual task within an execution.

**Properties**: Description, Status, Estimated Duration, Actual Duration, Assigned To

## API Endpoints

### Executions

```
POST   /api/v1/executions              - Create execution
GET    /api/v1/executions/:id          - Get execution details
GET    /api/v1/executions              - List executions
PATCH  /api/v1/executions/:id/start    - Start execution
PATCH  /api/v1/executions/:id/pause    - Pause execution
PATCH  /api/v1/executions/:id/resume   - Resume execution
PATCH  /api/v1/executions/:id/complete - Complete execution
POST   /api/v1/executions/:id/tasks    - Add task to execution
PATCH  /api/v1/executions/:id/tasks/:taskId - Update task status
```

### Health

```
GET    /api/v1/health                  - Health check
```

## Events

### Published Events

- **ExecutionScheduled**: When execution is created
- **ExecutionStarted**: When execution begins
- **ExecutionPaused**: When execution is paused
- **ExecutionResumed**: When execution resumes
- **ExecutionCompleted**: When execution finishes (triggers invoicing)
- **TaskCompleted**: When individual task finishes

### Consumed Events

- **PaymentCompleted**: Triggers execution creation (from Billing Service)
- **BudgetApproved**: Optional - can pre-create execution record

## DocumentDB Schema

### executions Collection

```javascript
{
  _id: ObjectId,
  executionId: String (UUID),
  serviceOrderId: String,
  budgetId: String,
  technicianId: String,
  status: String (enum),
  scheduledDate: Date,
  startDate: Date,
  endDate: Date,
  estimatedDuration: Number (minutes),
  actualDuration: Number (minutes),
  tasks: [{
    taskId: String (UUID),
    description: String,
    status: String (enum),
    estimatedDuration: Number,
    actualDuration: Number,
    assignedTo: String,
    completedAt: Date
  }],
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ executionId: 1 }` (unique)
- `{ serviceOrderId: 1 }`
- `{ budgetId: 1 }`
- `{ status: 1 }`
- `{ technicianId: 1, status: 1 }`

## Development

### Prerequisites

- Node.js 20+
- DocumentDB or MongoDB Local
- AWS credentials configured
- Docker (for local development)

### Local Development

```bash
# Install dependencies
npm install

# Start MongoDB Local and LocalStack
cd .. && docker compose up -d mongo localstack

# Start development server
npm run start:dev
```

Server runs on `http://localhost:3002`
Swagger docs: `http://localhost:3002/api/v1/docs`

### Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:watch

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Deployment

Same pattern as other services:
- Docker multi-stage build
- Kubernetes with Kustomize
- GitHub Actions CI/CD
- Terraform for infrastructure

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | HTTP server port | `3002` |
| `MONGODB_URI` | MongoDB/DocumentDB connection string | - |
| `MONGODB_DATABASE` | Database name | `executions` |
| `EVENT_BUS_NAME` | EventBridge bus name | - |

## Related Services

- [billing-service](../billing-service) - Billing Management (publishes PaymentCompleted)
- [os-service](../os-service) - Service Order Management
- [saga-orchestrator-service](../saga-orchestrator-service) - Saga Orchestration

## License

FIAP Tech Challenge - Phase 4
