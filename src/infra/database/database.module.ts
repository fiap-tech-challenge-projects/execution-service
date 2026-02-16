import { Module } from '@nestjs/common'
import { DynamoDBExecutionRepository } from './dynamodb-execution.repository'

@Module({
  providers: [
    {
      provide: 'IExecutionRepository',
      useClass: DynamoDBExecutionRepository,
    },
  ],
  exports: ['IExecutionRepository'],
})
export class DatabaseModule {}
