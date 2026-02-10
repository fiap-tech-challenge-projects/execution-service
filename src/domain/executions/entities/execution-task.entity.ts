import { TaskStatus } from '@shared/value-objects'

/**
 * ExecutionTask entity
 * Represents a task within an execution
 */
export class ExecutionTask {
  public readonly taskId: string
  public readonly description: string
  public readonly status: TaskStatus
  public readonly estimatedDuration: number // in minutes
  public readonly actualDuration?: number // in minutes
  public readonly assignedTo?: string
  public readonly completedAt?: Date

  constructor(
    taskId: string,
    description: string,
    status: TaskStatus,
    estimatedDuration: number,
    actualDuration?: number,
    assignedTo?: string,
    completedAt?: Date,
  ) {
    if (!description || description.trim() === '') {
      throw new Error('Task description cannot be empty')
    }

    if (estimatedDuration <= 0) {
      throw new Error('Estimated duration must be positive')
    }

    this.taskId = taskId
    this.description = description
    this.status = status
    this.estimatedDuration = estimatedDuration
    this.actualDuration = actualDuration
    this.assignedTo = assignedTo
    this.completedAt = completedAt
  }

  /**
   * Factory method to create a new task
   */
  public static create(
    description: string,
    estimatedDuration: number,
    assignedTo?: string,
  ): ExecutionTask {
    return new ExecutionTask(
      crypto.randomUUID(),
      description,
      TaskStatus.PENDING,
      estimatedDuration,
      undefined,
      assignedTo,
      undefined,
    )
  }

  /**
   * Start task
   */
  public start(): ExecutionTask {
    if (this.status !== TaskStatus.PENDING) {
      throw new Error(`Cannot start task in ${this.status} status`)
    }

    return new ExecutionTask(
      this.taskId,
      this.description,
      TaskStatus.IN_PROGRESS,
      this.estimatedDuration,
      this.actualDuration,
      this.assignedTo,
      this.completedAt,
    )
  }

  /**
   * Complete task
   */
  public complete(actualDuration: number): ExecutionTask {
    if (this.status !== TaskStatus.IN_PROGRESS) {
      throw new Error(`Cannot complete task in ${this.status} status`)
    }

    if (actualDuration <= 0) {
      throw new Error('Actual duration must be positive')
    }

    return new ExecutionTask(
      this.taskId,
      this.description,
      TaskStatus.COMPLETED,
      this.estimatedDuration,
      actualDuration,
      this.assignedTo,
      new Date(),
    )
  }

  /**
   * Cancel task
   */
  public cancel(): ExecutionTask {
    if (this.status === TaskStatus.COMPLETED) {
      throw new Error('Cannot cancel completed task')
    }

    return new ExecutionTask(
      this.taskId,
      this.description,
      TaskStatus.CANCELLED,
      this.estimatedDuration,
      this.actualDuration,
      this.assignedTo,
      this.completedAt,
    )
  }
}
