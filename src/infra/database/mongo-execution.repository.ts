import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Execution, ExecutionTask } from '@domain/executions/entities'
import { IExecutionRepository } from '@domain/executions/repositories'
import { ExecutionStatus, TaskStatus } from '@shared/value-objects'
import { ExecutionDocument } from './schemas/execution.schema'

@Injectable()
export class MongoExecutionRepository implements IExecutionRepository {
  constructor(
    @InjectModel(ExecutionDocument.name)
    private readonly executionModel: Model<ExecutionDocument>,
  ) {}

  async create(execution: Execution): Promise<Execution> {
    const document = new this.executionModel({
      executionId: execution.id,
      serviceOrderId: execution.serviceOrderId,
      budgetId: execution.budgetId,
      technicianId: execution.technicianId,
      status: execution.status,
      scheduledDate: execution.scheduledDate,
      startDate: execution.startDate,
      endDate: execution.endDate,
      estimatedDuration: execution.estimatedDuration,
      actualDuration: execution.actualDuration,
      tasks: execution.tasks.map((task) => ({
        taskId: task.taskId,
        description: task.description,
        status: task.status,
        estimatedDuration: task.estimatedDuration,
        actualDuration: task.actualDuration,
        assignedTo: task.assignedTo,
        completedAt: task.completedAt,
      })),
      notes: execution.notes,
    })

    const saved = await document.save()
    return this.mapToDomain(saved)
  }

  async findById(id: string): Promise<Execution | null> {
    const document = await this.executionModel.findOne({ executionId: id }).exec()
    return document ? this.mapToDomain(document) : null
  }

  async findByServiceOrderId(serviceOrderId: string): Promise<Execution | null> {
    const document = await this.executionModel.findOne({ serviceOrderId }).exec()
    return document ? this.mapToDomain(document) : null
  }

  async findByBudgetId(budgetId: string): Promise<Execution | null> {
    const document = await this.executionModel.findOne({ budgetId }).exec()
    return document ? this.mapToDomain(document) : null
  }

  async update(execution: Execution): Promise<Execution> {
    const document = await this.executionModel.findOneAndUpdate(
      { executionId: execution.id },
      {
        status: execution.status,
        technicianId: execution.technicianId,
        startDate: execution.startDate,
        endDate: execution.endDate,
        actualDuration: execution.actualDuration,
        tasks: execution.tasks.map((task) => ({
          taskId: task.taskId,
          description: task.description,
          status: task.status,
          estimatedDuration: task.estimatedDuration,
          actualDuration: task.actualDuration,
          assignedTo: task.assignedTo,
          completedAt: task.completedAt,
        })),
      },
      { new: true },
    ).exec()

    if (!document) {
      throw new Error(`Execution with ID ${execution.id} not found`)
    }

    return this.mapToDomain(document)
  }

  async findByStatus(status: ExecutionStatus): Promise<Execution[]> {
    const documents = await this.executionModel.find({ status }).exec()
    return documents.map((doc) => this.mapToDomain(doc))
  }

  async findByTechnicianId(
    technicianId: string,
    status?: ExecutionStatus,
  ): Promise<Execution[]> {
    const filter: any = { technicianId }
    if (status) {
      filter.status = status
    }

    const documents = await this.executionModel.find(filter).exec()
    return documents.map((doc) => this.mapToDomain(doc))
  }

  async findAll(filters?: {
    serviceOrderId?: string
    budgetId?: string
    technicianId?: string
    status?: ExecutionStatus
    limit?: number
    offset?: number
  }): Promise<{ executions: Execution[]; total: number }> {
    const query: any = {}

    if (filters?.serviceOrderId) {
      query.serviceOrderId = filters.serviceOrderId
    }
    if (filters?.budgetId) {
      query.budgetId = filters.budgetId
    }
    if (filters?.technicianId) {
      query.technicianId = filters.technicianId
    }
    if (filters?.status) {
      query.status = filters.status
    }

    const [documents, total] = await Promise.all([
      this.executionModel
        .find(query)
        .skip(filters?.offset || 0)
        .limit(filters?.limit || 100)
        .exec(),
      this.executionModel.countDocuments(query).exec(),
    ])

    return {
      executions: documents.map((doc) => this.mapToDomain(doc)),
      total,
    }
  }

  async delete(id: string): Promise<void> {
    await this.executionModel.deleteOne({ executionId: id }).exec()
  }

  private mapToDomain(document: ExecutionDocument): Execution {
    const tasks = document.tasks.map(
      (task) =>
        new ExecutionTask(
          task.taskId,
          task.description,
          task.status as TaskStatus,
          task.estimatedDuration,
          task.actualDuration,
          task.assignedTo,
          task.completedAt,
        ),
    )

    return new Execution(
      document.executionId,
      document.serviceOrderId,
      document.budgetId,
      document.technicianId,
      document.status as ExecutionStatus,
      document.scheduledDate,
      document.startDate,
      document.endDate,
      document.estimatedDuration,
      document.actualDuration,
      tasks,
      document.notes,
      document.createdAt,
      document.updatedAt,
    )
  }
}
