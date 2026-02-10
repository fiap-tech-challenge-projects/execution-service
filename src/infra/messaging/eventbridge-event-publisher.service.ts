import { Injectable, Logger } from '@nestjs/common'
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge'
import { IEventPublisher } from '@application/events/interfaces/event-publisher.interface'

@Injectable()
export class EventBridgeEventPublisherService implements IEventPublisher {
  private readonly logger = new Logger(EventBridgeEventPublisherService.name)
  private readonly eventBridge: EventBridgeClient
  private readonly eventBusName: string

  constructor() {
    const endpoint = process.env.EVENTBRIDGE_ENDPOINT
    this.eventBridge = new EventBridgeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      ...(endpoint && { endpoint }),
    })
    this.eventBusName =
      process.env.EVENT_BUS_NAME || 'fiap-tech-challenge-event-bus'
  }

  async publishExecutionScheduled(data: {
    executionId: string
    serviceOrderId: string
    budgetId: string
    scheduledDate?: Date
  }): Promise<void> {
    await this.publishEvent('ExecutionScheduled', 'execution.lifecycle', data)
  }

  async publishExecutionStarted(data: {
    executionId: string
    serviceOrderId: string
    startDate: Date
  }): Promise<void> {
    await this.publishEvent('ExecutionStarted', 'execution.lifecycle', data)
  }

  async publishExecutionPaused(data: {
    executionId: string
    serviceOrderId: string
  }): Promise<void> {
    await this.publishEvent('ExecutionPaused', 'execution.lifecycle', data)
  }

  async publishExecutionResumed(data: {
    executionId: string
    serviceOrderId: string
  }): Promise<void> {
    await this.publishEvent('ExecutionResumed', 'execution.lifecycle', data)
  }

  async publishExecutionCompleted(data: {
    executionId: string
    serviceOrderId: string
    budgetId: string
    endDate: Date
    actualDuration: number
  }): Promise<void> {
    await this.publishEvent('ExecutionCompleted', 'execution.lifecycle', data)
  }

  async publishExecutionCancelled(data: {
    executionId: string
    serviceOrderId: string
  }): Promise<void> {
    await this.publishEvent('ExecutionCancelled', 'execution.lifecycle', data)
  }

  async publishTaskCompleted(data: {
    executionId: string
    taskId: string
    completedAt: Date
  }): Promise<void> {
    await this.publishEvent('TaskCompleted', 'execution.task', data)
  }

  private async publishEvent(
    detailType: string,
    source: string,
    detail: any,
  ): Promise<void> {
    try {
      const command = new PutEventsCommand({
        Entries: [
          {
            EventBusName: this.eventBusName,
            Source: source,
            DetailType: detailType,
            Detail: JSON.stringify(detail),
            Time: new Date(),
          },
        ],
      })

      const response = await this.eventBridge.send(command)

      if (response.FailedEntryCount && response.FailedEntryCount > 0) {
        this.logger.error(
          `Failed to publish ${detailType} event`,
          response.Entries,
        )
        throw new Error(`Failed to publish ${detailType} event`)
      }

      this.logger.log(`Published ${detailType} event`)
    } catch (error) {
      this.logger.error(`Error publishing ${detailType} event`, error)
      throw error
    }
  }
}
