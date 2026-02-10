import { Execution, ExecutionTask } from '@domain/executions/entities'
import {
  ExecutionResponseDto,
  ExecutionTaskResponseDto,
} from '../dtos'

/**
 * Mapper for Execution entity and DTOs
 */
export class ExecutionMapper {
  /**
   * Map Execution entity to response DTO
   */
  static toResponseDto(execution: Execution): ExecutionResponseDto {
    return {
      id: execution.id,
      serviceOrderId: execution.serviceOrderId,
      budgetId: execution.budgetId,
      technicianId: execution.technicianId,
      status: execution.status,
      scheduledDate: execution.scheduledDate,
      startDate: execution.startDate,
      endDate: execution.endDate,
      estimatedDuration: execution.estimatedDuration,
      actualDuration: execution.actualDuration,
      tasks: execution.tasks.map((task) => this.toTaskResponseDto(task)),
      notes: execution.notes,
      createdAt: execution.createdAt,
      updatedAt: execution.updatedAt,
    }
  }

  /**
   * Map ExecutionTask entity to response DTO
   */
  static toTaskResponseDto(task: ExecutionTask): ExecutionTaskResponseDto {
    return {
      taskId: task.taskId,
      description: task.description,
      status: task.status,
      estimatedDuration: task.estimatedDuration,
      actualDuration: task.actualDuration,
      assignedTo: task.assignedTo,
      completedAt: task.completedAt,
    }
  }
}
