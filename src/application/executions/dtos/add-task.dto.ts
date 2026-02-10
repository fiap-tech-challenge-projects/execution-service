/**
 * DTO for adding a task to an execution
 */
export class AddTaskDto {
  executionId: string
  description: string
  estimatedDuration: number // in minutes
  assignedTo?: string
}
