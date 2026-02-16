import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDate } from 'class-validator'
import { Type } from 'class-transformer'

/**
 * DTO for creating an execution
 */
export class CreateExecutionDto {
  @IsString()
  @IsNotEmpty()
  serviceOrderId: string

  @IsString()
  @IsNotEmpty()
  budgetId: string

  @IsNumber()
  estimatedDuration: number // in minutes

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  scheduledDate?: Date

  @IsString()
  @IsOptional()
  technicianId?: string

  @IsString()
  @IsOptional()
  notes?: string
}
