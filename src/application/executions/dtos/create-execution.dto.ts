/**
 * DTO for creating an execution
 */
export class CreateExecutionDto {
  serviceOrderId: string
  budgetId: string
  estimatedDuration: number // in minutes
  scheduledDate?: Date
  technicianId?: string
  notes?: string
}
