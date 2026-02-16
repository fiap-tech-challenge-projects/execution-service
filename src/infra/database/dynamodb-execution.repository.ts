import { Injectable } from '@nestjs/common'
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { Execution, ExecutionTask } from '@domain/executions/entities'
import { IExecutionRepository } from '@domain/executions/repositories'
import { ExecutionStatus, TaskStatus } from '@shared/value-objects'

@Injectable()
export class DynamoDBExecutionRepository implements IExecutionRepository {
  private readonly client: DynamoDBClient
  private readonly tableName: string

  constructor() {
    this.client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    })
    this.tableName =
      process.env.DYNAMODB_TABLE_NAME ||
      'fiap-tech-challenge-executions-development'
  }

  async create(execution: Execution): Promise<Execution> {
    const item = {
      executionId: execution.id,
      timestamp: new Date().toISOString(),
      serviceOrderId: execution.serviceOrderId,
      budgetId: execution.budgetId,
      technicianId: execution.technicianId,
      status: execution.status,
      scheduledDate: execution.scheduledDate?.toISOString(),
      startDate: execution.startDate?.toISOString(),
      endDate: execution.endDate?.toISOString(),
      estimatedDuration: execution.estimatedDuration,
      actualDuration: execution.actualDuration,
      tasks: execution.tasks.map((task) => ({
        taskId: task.taskId,
        description: task.description,
        status: task.status,
        estimatedDuration: task.estimatedDuration,
        actualDuration: task.actualDuration,
        assignedTo: task.assignedTo,
        completedAt: task.completedAt?.toISOString(),
      })),
      notes: execution.notes,
      createdAt: execution.createdAt.toISOString(),
      updatedAt: execution.updatedAt.toISOString(),
    }

    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(item, { removeUndefinedValues: true }),
      }),
    )

    return execution
  }

  async findById(id: string): Promise<Execution | null> {
    // Query with partition key only (will return all items with this executionId)
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'executionId = :id',
        ExpressionAttributeValues: {
          ':id': { S: id },
        },
        ScanIndexForward: false, // Get most recent first
        Limit: 1,
      }),
    )

    if (!result.Items || result.Items.length === 0) {
      return null
    }

    const item = unmarshall(result.Items[0])
    return this.mapToDomain(item)
  }

  async findByServiceOrderId(serviceOrderId: string): Promise<Execution | null> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'ServiceOrderIndex',
        KeyConditionExpression: 'serviceOrderId = :serviceOrderId',
        ExpressionAttributeValues: {
          ':serviceOrderId': { S: serviceOrderId },
        },
        ScanIndexForward: false,
        Limit: 1,
      }),
    )

    if (!result.Items || result.Items.length === 0) {
      return null
    }

    const item = unmarshall(result.Items[0])
    return this.mapToDomain(item)
  }

  async findByBudgetId(budgetId: string): Promise<Execution | null> {
    const result = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'budgetId = :budgetId',
        ExpressionAttributeValues: {
          ':budgetId': { S: budgetId },
        },
        Limit: 1,
      }),
    )

    if (!result.Items || result.Items.length === 0) {
      return null
    }

    const item = unmarshall(result.Items[0])
    return this.mapToDomain(item)
  }

  async update(execution: Execution): Promise<Execution> {
    // First get the existing item to find the timestamp
    const existing = await this.findById(execution.id)
    if (!existing) {
      throw new Error(`Execution with ID ${execution.id} not found`)
    }

    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'executionId = :id',
        ExpressionAttributeValues: {
          ':id': { S: execution.id },
        },
        ScanIndexForward: false,
        Limit: 1,
      }),
    )

    const timestamp = result.Items?.[0] ? unmarshall(result.Items[0]).timestamp : new Date().toISOString()

    await this.client.send(
      new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({
          executionId: execution.id,
          timestamp,
        }),
        UpdateExpression:
          'SET #status = :status, technicianId = :technicianId, startDate = :startDate, endDate = :endDate, actualDuration = :actualDuration, tasks = :tasks, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: marshall({
          ':status': execution.status,
          ':technicianId': execution.technicianId,
          ':startDate': execution.startDate?.toISOString(),
          ':endDate': execution.endDate?.toISOString(),
          ':actualDuration': execution.actualDuration,
          ':tasks': execution.tasks.map((task) => ({
            taskId: task.taskId,
            description: task.description,
            status: task.status,
            estimatedDuration: task.estimatedDuration,
            actualDuration: task.actualDuration,
            assignedTo: task.assignedTo,
            completedAt: task.completedAt?.toISOString(),
          })),
          ':updatedAt': new Date().toISOString(),
        }, { removeUndefinedValues: true }),
      }),
    )

    return execution
  }

  async findByStatus(status: ExecutionStatus): Promise<Execution[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': { S: status },
        },
      }),
    )

    if (!result.Items || result.Items.length === 0) {
      return []
    }

    return result.Items.map((item) => this.mapToDomain(unmarshall(item)))
  }

  async findByTechnicianId(
    technicianId: string,
    status?: ExecutionStatus,
  ): Promise<Execution[]> {
    const filterExpression = status
      ? 'technicianId = :technicianId AND #status = :status'
      : 'technicianId = :technicianId'

    const expressionAttributeValues: any = {
      ':technicianId': { S: technicianId },
    }
    const expressionAttributeNames: any = {}

    if (status) {
      expressionAttributeValues[':status'] = { S: status }
      expressionAttributeNames['#status'] = 'status'
    }

    const result = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ...(status && { ExpressionAttributeNames: expressionAttributeNames }),
      }),
    )

    if (!result.Items || result.Items.length === 0) {
      return []
    }

    return result.Items.map((item) => this.mapToDomain(unmarshall(item)))
  }

  async findAll(filters?: {
    serviceOrderId?: string
    budgetId?: string
    technicianId?: string
    status?: ExecutionStatus
    limit?: number
    offset?: number
  }): Promise<{ executions: Execution[]; total: number }> {
    // Build filter expression
    const filterExpressions: string[] = []
    const expressionAttributeValues: any = {}
    const expressionAttributeNames: any = {}

    if (filters?.serviceOrderId) {
      filterExpressions.push('serviceOrderId = :serviceOrderId')
      expressionAttributeValues[':serviceOrderId'] = { S: filters.serviceOrderId }
    }
    if (filters?.budgetId) {
      filterExpressions.push('budgetId = :budgetId')
      expressionAttributeValues[':budgetId'] = { S: filters.budgetId }
    }
    if (filters?.technicianId) {
      filterExpressions.push('technicianId = :technicianId')
      expressionAttributeValues[':technicianId'] = { S: filters.technicianId }
    }
    if (filters?.status) {
      filterExpressions.push('#status = :status')
      expressionAttributeValues[':status'] = { S: filters.status }
      expressionAttributeNames['#status'] = 'status'
    }

    const result = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
        ...(filterExpressions.length > 0 && {
          FilterExpression: filterExpressions.join(' AND '),
          ExpressionAttributeValues: expressionAttributeValues,
        }),
        ...(Object.keys(expressionAttributeNames).length > 0 && {
          ExpressionAttributeNames: expressionAttributeNames,
        }),
        Limit: filters?.limit || 100,
      }),
    )

    const executions = result.Items
      ? result.Items.map((item) => this.mapToDomain(unmarshall(item)))
      : []

    // Note: DynamoDB doesn't provide total count with Scan, would need separate Count operation
    // For simplicity, returning items length as total (may not be accurate with pagination)
    return {
      executions,
      total: executions.length,
    }
  }

  async delete(id: string): Promise<void> {
    // First get the item to find the timestamp
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'executionId = :id',
        ExpressionAttributeValues: {
          ':id': { S: id },
        },
        ScanIndexForward: false,
        Limit: 1,
      }),
    )

    if (!result.Items || result.Items.length === 0) {
      return
    }

    const item = unmarshall(result.Items[0])

    await this.client.send(
      new DeleteItemCommand({
        TableName: this.tableName,
        Key: marshall({
          executionId: id,
          timestamp: item.timestamp,
        }),
      }),
    )
  }

  private mapToDomain(item: any): Execution {
    const tasks = (item.tasks || []).map(
      (task: any) =>
        new ExecutionTask(
          task.taskId,
          task.description,
          task.status as TaskStatus,
          task.estimatedDuration,
          task.actualDuration,
          task.assignedTo,
          task.completedAt ? new Date(task.completedAt) : undefined,
        ),
    )

    return new Execution(
      item.executionId,
      item.serviceOrderId,
      item.budgetId,
      item.technicianId,
      item.status as ExecutionStatus,
      item.scheduledDate ? new Date(item.scheduledDate) : undefined,
      item.startDate ? new Date(item.startDate) : undefined,
      item.endDate ? new Date(item.endDate) : undefined,
      item.estimatedDuration,
      item.actualDuration,
      tasks,
      item.notes,
      item.createdAt ? new Date(item.createdAt) : new Date(),
      item.updatedAt ? new Date(item.updatedAt) : new Date(),
    )
  }
}
