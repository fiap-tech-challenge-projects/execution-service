import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger'
import {
  CreateExecutionUseCase,
  StartExecutionUseCase,
  CompleteExecutionUseCase,
  GetExecutionUseCase,
  AddTaskUseCase,
} from '@application/executions/use-cases'
import {
  CreateExecutionDto,
  ExecutionResponseDto,
  AddTaskDto,
} from '@application/executions/dtos'
import { ExecutionStatus } from '@shared/value-objects'

@ApiTags('Executions')
@Controller('api/v1/executions')
export class ExecutionsController {
  constructor(
    private readonly createExecutionUseCase: CreateExecutionUseCase,
    private readonly startExecutionUseCase: StartExecutionUseCase,
    private readonly completeExecutionUseCase: CompleteExecutionUseCase,
    private readonly getExecutionUseCase: GetExecutionUseCase,
    private readonly addTaskUseCase: AddTaskUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new execution' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Execution created successfully',
    type: ExecutionResponseDto,
  })
  async create(
    @Body() createExecutionDto: CreateExecutionDto,
  ): Promise<ExecutionResponseDto> {
    return this.createExecutionUseCase.execute(createExecutionDto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get execution by ID' })
  @ApiParam({ name: 'id', description: 'Execution ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Execution found',
    type: ExecutionResponseDto,
  })
  async findOne(@Param('id') id: string): Promise<ExecutionResponseDto> {
    return this.getExecutionUseCase.execute(id)
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Start an execution' })
  @ApiParam({ name: 'id', description: 'Execution ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Execution started successfully',
    type: ExecutionResponseDto,
  })
  async start(@Param('id') id: string): Promise<ExecutionResponseDto> {
    return this.startExecutionUseCase.execute(id)
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete an execution' })
  @ApiParam({ name: 'id', description: 'Execution ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Execution completed successfully',
    type: ExecutionResponseDto,
  })
  async complete(@Param('id') id: string): Promise<ExecutionResponseDto> {
    return this.completeExecutionUseCase.execute(id)
  }

  @Post(':id/tasks')
  @ApiOperation({ summary: 'Add task to execution' })
  @ApiParam({ name: 'id', description: 'Execution ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task added successfully',
    type: ExecutionResponseDto,
  })
  async addTask(
    @Param('id') id: string,
    @Body() body: Omit<AddTaskDto, 'executionId'>,
  ): Promise<ExecutionResponseDto> {
    const dto: AddTaskDto = { executionId: id, ...body }
    return this.addTaskUseCase.execute(dto)
  }
}
