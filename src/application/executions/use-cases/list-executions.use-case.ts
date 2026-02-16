import { Injectable, Inject } from '@nestjs/common'
import { IExecutionRepository } from '@domain/executions/repositories'
import { ExecutionResponseDto } from '../dtos'
import { ExecutionMapper } from '../mappers/execution.mapper'
import { ExecutionStatus } from '@shared/value-objects'

@Injectable()
export class ListExecutionsUseCase {
  constructor(
    @Inject('IExecutionRepository')
    private readonly executionRepository: IExecutionRepository,
  ) {}

  async execute(filters?: {
    serviceOrderId?: string
    budgetId?: string
    status?: ExecutionStatus
    limit?: number
    offset?: number
  }): Promise<{ executions: ExecutionResponseDto[]; total: number }> {
    const result = await this.executionRepository.findAll(filters)

    return {
      executions: result.executions.map((e) =>
        ExecutionMapper.toResponseDto(e),
      ),
      total: result.total,
    }
  }
}
