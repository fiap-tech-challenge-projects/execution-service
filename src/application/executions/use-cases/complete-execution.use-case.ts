import { Injectable, NotFoundException } from '@nestjs/common'
import { IExecutionRepository } from '@domain/executions/repositories'
import { IEventPublisher } from '@application/events/interfaces/event-publisher.interface'
import { ExecutionResponseDto } from '../dtos'
import { ExecutionMapper } from '../mappers/execution.mapper'

/**
 * Use case for completing an execution
 */
@Injectable()
export class CompleteExecutionUseCase {
  constructor(
    private readonly executionRepository: IExecutionRepository,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(executionId: string): Promise<ExecutionResponseDto> {
    const execution = await this.executionRepository.findById(executionId)

    if (!execution) {
      throw new NotFoundException(`Execution with ID ${executionId} not found`)
    }

    const completedExecution = execution.complete()
    const updatedExecution =
      await this.executionRepository.update(completedExecution)

    await this.eventPublisher.publishExecutionCompleted({
      executionId: updatedExecution.id,
      serviceOrderId: updatedExecution.serviceOrderId,
      budgetId: updatedExecution.budgetId,
      endDate: updatedExecution.endDate!,
      actualDuration: updatedExecution.actualDuration!,
    })

    return ExecutionMapper.toResponseDto(updatedExecution)
  }
}
