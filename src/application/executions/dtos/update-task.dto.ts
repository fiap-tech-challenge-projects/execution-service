import { TaskStatus } from '@shared/value-objects'

/**
 * DTO for updating a task status
 */
export class UpdateTaskDto {
  executionId: string
  taskId: string
  status: TaskStatus
  actualDuration?: number // in minutes
}
