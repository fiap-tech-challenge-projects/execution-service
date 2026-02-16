import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator'

/**
 * DTO for adding a task to an execution
 */
export class AddTaskDto {
  @IsString()
  @IsNotEmpty()
  executionId: string

  @IsString()
  @IsNotEmpty()
  description: string

  @IsNumber()
  estimatedDuration: number // in minutes

  @IsString()
  @IsOptional()
  assignedTo?: string
}
