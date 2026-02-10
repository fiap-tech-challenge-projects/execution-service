import { ExecutionStatus, TaskStatus } from '@shared/value-objects'

/**
 * DTO for execution response
 */
export class ExecutionResponseDto {
  id: string
  serviceOrderId: string
  budgetId: string
  technicianId?: string
  status: ExecutionStatus
  scheduledDate?: Date
  startDate?: Date
  endDate?: Date
  estimatedDuration: number
  actualDuration?: number
  tasks: ExecutionTaskResponseDto[]
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export class ExecutionTaskResponseDto {
  taskId: string
  description: string
  status: TaskStatus
  estimatedDuration: number
  actualDuration?: number
  assignedTo?: string
  completedAt?: Date
}
