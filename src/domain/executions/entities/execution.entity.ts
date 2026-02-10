import { BaseEntity } from '@shared/base'
import { ExecutionStatus } from '@shared/value-objects'
import { ExecutionTask } from './execution-task.entity'
import { InvalidExecutionStatusTransitionException } from '../exceptions'

/**
 * Execution aggregate root
 * Represents the execution of a service order
 */
export class Execution extends BaseEntity {
  public readonly serviceOrderId: string
  public readonly budgetId: string
  public readonly technicianId?: string
  public readonly status: ExecutionStatus
  public readonly scheduledDate?: Date
  public readonly startDate?: Date
  public readonly endDate?: Date
  public readonly estimatedDuration: number // in minutes
  public readonly actualDuration?: number // in minutes
  public readonly tasks: ExecutionTask[]
  public readonly notes?: string

  constructor(
    id: string,
    serviceOrderId: string,
    budgetId: string,
    technicianId: string | undefined,
    status: ExecutionStatus,
    scheduledDate: Date | undefined,
    startDate: Date | undefined,
    endDate: Date | undefined,
    estimatedDuration: number,
    actualDuration: number | undefined,
    tasks: ExecutionTask[],
    notes: string | undefined,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt)
    this.serviceOrderId = serviceOrderId
    this.budgetId = budgetId
    this.technicianId = technicianId
    this.status = status
    this.scheduledDate = scheduledDate
    this.startDate = startDate
    this.endDate = endDate
    this.estimatedDuration = estimatedDuration
    this.actualDuration = actualDuration
    this.tasks = tasks
    this.notes = notes
  }

  /**
   * Factory method to create a new execution
   */
  public static create(
    serviceOrderId: string,
    budgetId: string,
    estimatedDuration: number,
    scheduledDate?: Date,
    technicianId?: string,
    notes?: string,
  ): Execution {
    if (!serviceOrderId || serviceOrderId.trim() === '') {
      throw new Error('Service Order ID is required')
    }

    if (!budgetId || budgetId.trim() === '') {
      throw new Error('Budget ID is required')
    }

    if (estimatedDuration <= 0) {
      throw new Error('Estimated duration must be positive')
    }

    const now = new Date()

    return new Execution(
      crypto.randomUUID(),
      serviceOrderId,
      budgetId,
      technicianId,
      ExecutionStatus.SCHEDULED,
      scheduledDate,
      undefined,
      undefined,
      estimatedDuration,
      undefined,
      [],
      notes,
      now,
      now,
    )
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(newStatus: ExecutionStatus): void {
    const allowedTransitions: Record<ExecutionStatus, ExecutionStatus[]> = {
      [ExecutionStatus.SCHEDULED]: [
        ExecutionStatus.IN_PROGRESS,
        ExecutionStatus.CANCELLED,
      ],
      [ExecutionStatus.IN_PROGRESS]: [
        ExecutionStatus.PAUSED,
        ExecutionStatus.COMPLETED,
        ExecutionStatus.CANCELLED,
      ],
      [ExecutionStatus.PAUSED]: [
        ExecutionStatus.IN_PROGRESS,
        ExecutionStatus.CANCELLED,
      ],
      [ExecutionStatus.COMPLETED]: [ExecutionStatus.INVOICED],
      [ExecutionStatus.INVOICED]: [],
      [ExecutionStatus.CANCELLED]: [],
    }

    const allowedStatuses = allowedTransitions[this.status]
    if (!allowedStatuses.includes(newStatus)) {
      throw new InvalidExecutionStatusTransitionException(
        this.status,
        newStatus,
        allowedStatuses,
      )
    }
  }

  /**
   * Start execution
   */
  public start(): Execution {
    this.validateStatusTransition(ExecutionStatus.IN_PROGRESS)

    return new Execution(
      this.id,
      this.serviceOrderId,
      this.budgetId,
      this.technicianId,
      ExecutionStatus.IN_PROGRESS,
      this.scheduledDate,
      new Date(),
      this.endDate,
      this.estimatedDuration,
      this.actualDuration,
      this.tasks,
      this.notes,
      this.createdAt,
      new Date(),
    )
  }

  /**
   * Pause execution
   */
  public pause(): Execution {
    this.validateStatusTransition(ExecutionStatus.PAUSED)

    return new Execution(
      this.id,
      this.serviceOrderId,
      this.budgetId,
      this.technicianId,
      ExecutionStatus.PAUSED,
      this.scheduledDate,
      this.startDate,
      this.endDate,
      this.estimatedDuration,
      this.actualDuration,
      this.tasks,
      this.notes,
      this.createdAt,
      new Date(),
    )
  }

  /**
   * Resume execution
   */
  public resume(): Execution {
    this.validateStatusTransition(ExecutionStatus.IN_PROGRESS)

    return new Execution(
      this.id,
      this.serviceOrderId,
      this.budgetId,
      this.technicianId,
      ExecutionStatus.IN_PROGRESS,
      this.scheduledDate,
      this.startDate,
      this.endDate,
      this.estimatedDuration,
      this.actualDuration,
      this.tasks,
      this.notes,
      this.createdAt,
      new Date(),
    )
  }

  /**
   * Complete execution
   */
  public complete(): Execution {
    this.validateStatusTransition(ExecutionStatus.COMPLETED)

    // Calculate actual duration
    const actualDuration = this.startDate
      ? Math.floor((new Date().getTime() - this.startDate.getTime()) / 60000)
      : this.estimatedDuration

    return new Execution(
      this.id,
      this.serviceOrderId,
      this.budgetId,
      this.technicianId,
      ExecutionStatus.COMPLETED,
      this.scheduledDate,
      this.startDate,
      new Date(),
      this.estimatedDuration,
      actualDuration,
      this.tasks,
      this.notes,
      this.createdAt,
      new Date(),
    )
  }

  /**
   * Mark as invoiced
   */
  public markInvoiced(): Execution {
    this.validateStatusTransition(ExecutionStatus.INVOICED)

    return new Execution(
      this.id,
      this.serviceOrderId,
      this.budgetId,
      this.technicianId,
      ExecutionStatus.INVOICED,
      this.scheduledDate,
      this.startDate,
      this.endDate,
      this.estimatedDuration,
      this.actualDuration,
      this.tasks,
      this.notes,
      this.createdAt,
      new Date(),
    )
  }

  /**
   * Cancel execution
   */
  public cancel(): Execution {
    this.validateStatusTransition(ExecutionStatus.CANCELLED)

    return new Execution(
      this.id,
      this.serviceOrderId,
      this.budgetId,
      this.technicianId,
      ExecutionStatus.CANCELLED,
      this.scheduledDate,
      this.startDate,
      new Date(),
      this.estimatedDuration,
      this.actualDuration,
      this.tasks,
      this.notes,
      this.createdAt,
      new Date(),
    )
  }

  /**
   * Add task to execution
   */
  public addTask(task: ExecutionTask): Execution {
    if (this.status !== ExecutionStatus.SCHEDULED && this.status !== ExecutionStatus.IN_PROGRESS) {
      throw new Error(`Cannot add task to execution in ${this.status} status`)
    }

    return new Execution(
      this.id,
      this.serviceOrderId,
      this.budgetId,
      this.technicianId,
      this.status,
      this.scheduledDate,
      this.startDate,
      this.endDate,
      this.estimatedDuration,
      this.actualDuration,
      [...this.tasks, task],
      this.notes,
      this.createdAt,
      new Date(),
    )
  }

  /**
   * Update task in execution
   */
  public updateTask(taskId: string, updatedTask: ExecutionTask): Execution {
    const taskIndex = this.tasks.findIndex((t) => t.taskId === taskId)

    if (taskIndex === -1) {
      throw new Error(`Task with ID ${taskId} not found`)
    }

    const newTasks = [...this.tasks]
    newTasks[taskIndex] = updatedTask

    return new Execution(
      this.id,
      this.serviceOrderId,
      this.budgetId,
      this.technicianId,
      this.status,
      this.scheduledDate,
      this.startDate,
      this.endDate,
      this.estimatedDuration,
      this.actualDuration,
      newTasks,
      this.notes,
      this.createdAt,
      new Date(),
    )
  }

  /**
   * Get task by ID
   */
  public getTask(taskId: string): ExecutionTask | undefined {
    return this.tasks.find((t) => t.taskId === taskId)
  }

  /**
   * Check if execution is in final state
   */
  public isInFinalState(): boolean {
    return (
      this.status === ExecutionStatus.COMPLETED ||
      this.status === ExecutionStatus.INVOICED ||
      this.status === ExecutionStatus.CANCELLED
    )
  }

  /**
   * Check if execution can be modified
   */
  public canBeModified(): boolean {
    return !this.isInFinalState()
  }
}
