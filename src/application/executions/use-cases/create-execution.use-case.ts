import { Injectable } from '@nestjs/common'
import { Execution } from '@domain/executions/entities'
import { IExecutionRepository } from '@domain/executions/repositories'
import { IEventPublisher } from '@application/events/interfaces/event-publisher.interface'
import { CreateExecutionDto, ExecutionResponseDto } from '../dtos'
import { ExecutionMapper } from '../mappers/execution.mapper'

/**
 * Use case for creating an execution
 */
@Injectable()
export class CreateExecutionUseCase {
  constructor(
    private readonly executionRepository: IExecutionRepository,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(dto: CreateExecutionDto): Promise<ExecutionResponseDto> {
    // Check if execution already exists for this service order or budget
    const existingByServiceOrder =
      await this.executionRepository.findByServiceOrderId(dto.serviceOrderId)

    if (existingByServiceOrder) {
      throw new Error(
        `Execution already exists for service order ${dto.serviceOrderId}`,
      )
    }

    const existingByBudget = await this.executionRepository.findByBudgetId(
      dto.budgetId,
    )

    if (existingByBudget) {
      throw new Error(`Execution already exists for budget ${dto.budgetId}`)
    }

    // Create execution entity
    const execution = Execution.create(
      dto.serviceOrderId,
      dto.budgetId,
      dto.estimatedDuration,
      dto.scheduledDate,
      dto.technicianId,
      dto.notes,
    )

    // Persist execution
    const createdExecution = await this.executionRepository.create(execution)

    // Publish event
    await this.eventPublisher.publishExecutionScheduled({
      executionId: createdExecution.id,
      serviceOrderId: createdExecution.serviceOrderId,
      budgetId: createdExecution.budgetId,
      scheduledDate: createdExecution.scheduledDate,
    })

    // Return response DTO
    return ExecutionMapper.toResponseDto(createdExecution)
  }
}
