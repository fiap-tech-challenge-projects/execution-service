import { Injectable, NotFoundException } from '@nestjs/common'
import { IExecutionRepository } from '@domain/executions/repositories'
import { IEventPublisher } from '@application/events/interfaces/event-publisher.interface'
import { ExecutionResponseDto } from '../dtos'
import { ExecutionMapper } from '../mappers/execution.mapper'

/**
 * Use case for starting an execution
 */
@Injectable()
export class StartExecutionUseCase {
  constructor(
    private readonly executionRepository: IExecutionRepository,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(executionId: string): Promise<ExecutionResponseDto> {
    const execution = await this.executionRepository.findById(executionId)

    if (!execution) {
      throw new NotFoundException(`Execution with ID ${executionId} not found`)
    }

    const startedExecution = execution.start()
    const updatedExecution =
      await this.executionRepository.update(startedExecution)

    await this.eventPublisher.publishExecutionStarted({
      executionId: updatedExecution.id,
      serviceOrderId: updatedExecution.serviceOrderId,
      startDate: updatedExecution.startDate!,
    })

    return ExecutionMapper.toResponseDto(updatedExecution)
  }
}
