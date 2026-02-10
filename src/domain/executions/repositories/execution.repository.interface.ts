import { Execution } from '../entities'
import { ExecutionStatus } from '@shared/value-objects'

/**
 * Execution repository interface
 * Defines contract for execution persistence
 */
export interface IExecutionRepository {
  /**
   * Create a new execution
   */
  create(execution: Execution): Promise<Execution>

  /**
   * Find execution by ID
   */
  findById(id: string): Promise<Execution | null>

  /**
   * Find execution by service order ID
   */
  findByServiceOrderId(serviceOrderId: string): Promise<Execution | null>

  /**
   * Find execution by budget ID
   */
  findByBudgetId(budgetId: string): Promise<Execution | null>

  /**
   * Update an existing execution
   */
  update(execution: Execution): Promise<Execution>

  /**
   * Find executions by status
   */
  findByStatus(status: ExecutionStatus): Promise<Execution[]>

  /**
   * Find executions by technician ID
   */
  findByTechnicianId(
    technicianId: string,
    status?: ExecutionStatus,
  ): Promise<Execution[]>

  /**
   * List all executions with optional filters
   */
  findAll(filters?: {
    serviceOrderId?: string
    budgetId?: string
    technicianId?: string
    status?: ExecutionStatus
    limit?: number
    offset?: number
  }): Promise<{ executions: Execution[]; total: number }>

  /**
   * Delete an execution
   */
  delete(id: string): Promise<void>
}
