import { Module } from '@nestjs/common'
import { DatabaseModule } from '@infra/database/database.module'
import { MessagingModule } from '@infra/messaging/messaging.module'
import {
  CreateExecutionUseCase,
  StartExecutionUseCase,
  CompleteExecutionUseCase,
  GetExecutionUseCase,
  AddTaskUseCase,
} from './use-cases'

@Module({
  imports: [DatabaseModule, MessagingModule],
  providers: [
    CreateExecutionUseCase,
    StartExecutionUseCase,
    CompleteExecutionUseCase,
    GetExecutionUseCase,
    AddTaskUseCase,
  ],
  exports: [
    CreateExecutionUseCase,
    StartExecutionUseCase,
    CompleteExecutionUseCase,
    GetExecutionUseCase,
    AddTaskUseCase,
  ],
})
export class ExecutionsModule {}
