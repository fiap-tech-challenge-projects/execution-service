import { Injectable, NotFoundException } from '@nestjs/common'
import { IExecutionRepository } from '@domain/executions/repositories'
import { ExecutionTask } from '@domain/executions/entities'
import { AddTaskDto, ExecutionResponseDto } from '../dtos'
import { ExecutionMapper } from '../mappers/execution.mapper'

@Injectable()
export class AddTaskUseCase {
  constructor(private readonly executionRepository: IExecutionRepository) {}

  async execute(dto: AddTaskDto): Promise<ExecutionResponseDto> {
    const execution = await this.executionRepository.findById(dto.executionId)

    if (!execution) {
      throw new NotFoundException(
        `Execution with ID ${dto.executionId} not found`,
      )
    }

    const task = ExecutionTask.create(
      dto.description,
      dto.estimatedDuration,
      dto.assignedTo,
    )

    const updatedExecution = execution.addTask(task)
    const savedExecution =
      await this.executionRepository.update(updatedExecution)

    return ExecutionMapper.toResponseDto(savedExecution)
  }
}
