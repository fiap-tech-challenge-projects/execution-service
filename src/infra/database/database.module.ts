import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  ExecutionDocument,
  ExecutionSchema,
} from './schemas/execution.schema'
import { MongoExecutionRepository } from './mongo-execution.repository'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExecutionDocument.name, schema: ExecutionSchema },
    ]),
  ],
  providers: [
    {
      provide: 'IExecutionRepository',
      useClass: MongoExecutionRepository,
    },
  ],
  exports: ['IExecutionRepository'],
})
export class DatabaseModule {}
