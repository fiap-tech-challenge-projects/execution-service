/**
 * Event publisher interface for publishing domain events to EventBridge
 */
export interface IEventPublisher {
  /**
   * Publish ExecutionScheduled event
   */
  publishExecutionScheduled(data: {
    executionId: string
    serviceOrderId: string
    budgetId: string
    scheduledDate?: Date
  }): Promise<void>

  /**
   * Publish ExecutionStarted event
   */
  publishExecutionStarted(data: {
    executionId: string
    serviceOrderId: string
    startDate: Date
  }): Promise<void>

  /**
   * Publish ExecutionPaused event
   */
  publishExecutionPaused(data: {
    executionId: string
    serviceOrderId: string
  }): Promise<void>

  /**
   * Publish ExecutionResumed event
   */
  publishExecutionResumed(data: {
    executionId: string
    serviceOrderId: string
  }): Promise<void>

  /**
   * Publish ExecutionCompleted event
   */
  publishExecutionCompleted(data: {
    executionId: string
    serviceOrderId: string
    budgetId: string
    endDate: Date
    actualDuration: number
  }): Promise<void>

  /**
   * Publish ExecutionCancelled event
   */
  publishExecutionCancelled(data: {
    executionId: string
    serviceOrderId: string
  }): Promise<void>

  /**
   * Publish TaskCompleted event
   */
  publishTaskCompleted(data: {
    executionId: string
    taskId: string
    completedAt: Date
  }): Promise<void>
}
