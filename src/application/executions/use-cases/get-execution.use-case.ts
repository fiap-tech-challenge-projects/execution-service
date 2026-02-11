import { Injectable, NotFoundException, Inject } from '@nestjs/common'
import { IExecutionRepository } from '@domain/executions/repositories'
import { ExecutionResponseDto } from '../dtos'
import { ExecutionMapper } from '../mappers/execution.mapper'

@Injectable()
export class GetExecutionUseCase {
  constructor(
    @Inject('IExecutionRepository')
    private readonly executionRepository: IExecutionRepository
  ) {}

  async execute(executionId: string): Promise<ExecutionResponseDto> {
    const execution = await this.executionRepository.findById(executionId)

    if (!execution) {
      throw new NotFoundException(`Execution with ID ${executionId} not found`)
    }

    return ExecutionMapper.toResponseDto(execution)
  }
}
