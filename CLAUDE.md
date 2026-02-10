# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note**: Do NOT add `Co-Authored-By` to commits in this project.

## Project Overview

Execution Service - Service Execution Management microservice for FIAP Tech Challenge Phase 4. Manages execution tracking, task management, and completion workflows using DocumentDB and EventBridge/SQS.

## Common Commands

```bash
# Development
npm run start:dev          # Hot reload
npm run start:debug        # With debugger

# Testing
npm test                   # All tests
npm run test:watch         # Watch mode
npm run test:cov           # With coverage

# Code Quality
npm run lint               # ESLint
npm run format             # Prettier

# Build & Deploy
npm run build              # Production build
docker build -t execution-service:local .
kubectl apply -k k8s/overlays/development
```

## Architecture (DDD with DocumentDB)

```
src/
├── domain/                # Core business logic
│   ├── executions/        # Execution aggregate
│   └── shared/            # Value objects (ExecutionStatus, TaskStatus)
├── application/           # Use cases
│   ├── executions/        # Execution operations
│   └── events/            # Event handlers
├── infra/                 # Infrastructure
│   ├── database/          # MongoDB/DocumentDB repositories
│   └── messaging/         # EventBridge/SQS
├── interfaces/            # HTTP layer
│   └── rest/              # Controllers
└── shared/                # Cross-cutting concerns
```

## Path Aliases

```typescript
import { Execution } from '@domain/executions'
import { CreateExecutionUseCase } from '@application/executions'
import { MongoExecutionRepository } from '@infra/database'
import { ExecutionController } from '@interfaces/rest'
import { ExecutionStatus } from '@shared/value-objects'
```

## Key Patterns

1. **DocumentDB (MongoDB)**: Mongoose for schema and validation
2. **Embedded Documents**: Tasks embedded in Execution document
3. **Event Sourcing**: Execution status changes publish events
4. **Idempotency**: Prevents duplicate execution creation

## Event Integration

**Publishes**:
- `ExecutionScheduled` - Execution created
- `ExecutionStarted` - Execution began
- `ExecutionCompleted` - Execution finished (triggers invoicing)

**Consumes**:
- `PaymentCompleted` - From Billing Service (triggers execution creation)

## DocumentDB

Connection managed by Mongoose. Schema includes:
- Execution aggregate with embedded tasks
- Indexes on executionId, serviceOrderId, budgetId, status
- TTL index for cleanup (optional)

Connection URI format:
```
mongodb://username:password@cluster-endpoint:27017/executions?tls=true&tlsCAFile=rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

## Dependencies

- **messaging-infra**: EventBridge bus, SQS queues
- **database-managed-infra**: DocumentDB cluster
- **kubernetes-core-infra**: EKS cluster, namespace `ftc-app`
