import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { ExecutionStatus, TaskStatus } from '@shared/value-objects'

@Schema({ _id: false })
export class ExecutionTaskDocument {
  @Prop({ required: true })
  taskId: string

  @Prop({ required: true })
  description: string

  @Prop({ required: true, enum: TaskStatus })
  status: TaskStatus

  @Prop({ required: true })
  estimatedDuration: number

  @Prop()
  actualDuration?: number

  @Prop()
  assignedTo?: string

  @Prop()
  completedAt?: Date
}

const ExecutionTaskSchema = SchemaFactory.createForClass(ExecutionTaskDocument)

@Schema({ collection: 'executions', timestamps: true })
export class ExecutionDocument extends Document {
  @Prop({ required: true, unique: true })
  executionId: string

  @Prop({ required: true, index: true })
  serviceOrderId: string

  @Prop({ required: true, index: true })
  budgetId: string

  @Prop({ index: true })
  technicianId?: string

  @Prop({ required: true, enum: ExecutionStatus, index: true })
  status: ExecutionStatus

  @Prop()
  scheduledDate?: Date

  @Prop()
  startDate?: Date

  @Prop()
  endDate?: Date

  @Prop({ required: true })
  estimatedDuration: number

  @Prop()
  actualDuration?: number

  @Prop({ type: [ExecutionTaskSchema], default: [] })
  tasks: ExecutionTaskDocument[]

  @Prop()
  notes?: string

  createdAt?: Date
  updatedAt?: Date
}

export const ExecutionSchema = SchemaFactory.createForClass(ExecutionDocument)

// Create compound indexes
ExecutionSchema.index({ technicianId: 1, status: 1 })
