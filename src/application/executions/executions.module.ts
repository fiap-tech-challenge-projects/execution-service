import { Module, forwardRef } from '@nestjs/common'
import { DatabaseModule } from '@infra/database/database.module'
import { MessagingModule } from '@infra/messaging/messaging.module'
import {
  CreateExecutionUseCase,
  StartExecutionUseCase,
  CompleteExecutionUseCase,
  GetExecutionUseCase,
  ListExecutionsUseCase,
  AddTaskUseCase,
} from './use-cases'

@Module({
  imports: [DatabaseModule, forwardRef(() => MessagingModule)],
  providers: [
    CreateExecutionUseCase,
    StartExecutionUseCase,
    CompleteExecutionUseCase,
    GetExecutionUseCase,
    ListExecutionsUseCase,
    AddTaskUseCase,
  ],
  exports: [
    CreateExecutionUseCase,
    StartExecutionUseCase,
    CompleteExecutionUseCase,
    GetExecutionUseCase,
    ListExecutionsUseCase,
    AddTaskUseCase,
  ],
})
export class ExecutionsModule {}
