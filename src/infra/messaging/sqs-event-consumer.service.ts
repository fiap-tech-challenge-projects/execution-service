import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs'
import { CreateExecutionUseCase } from '@application/executions/use-cases'

@Injectable()
export class SqsEventConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqsEventConsumerService.name)
  private readonly sqs: SQSClient
  private readonly queueUrl: string
  private polling = false

  constructor(private readonly createExecutionUseCase: CreateExecutionUseCase) {
    this.sqs = new SQSClient({
      region: process.env.AWS_REGION || 'us-east-1',
    })
    this.queueUrl = process.env.SQS_QUEUE_URL || ''
  }

  onModuleInit() {
    if (!this.queueUrl) {
      this.logger.warn('SQS_QUEUE_URL not configured, event consumer disabled')
      return
    }
    this.polling = true
    this.logger.log(`Starting SQS consumer for queue: ${this.queueUrl}`)
    this.poll()
  }

  onModuleDestroy() {
    this.polling = false
    this.logger.log('Stopping SQS consumer')
  }

  private async poll(): Promise<void> {
    while (this.polling) {
      try {
        const result = await this.sqs.send(
          new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,
            MessageAttributeNames: ['All'],
          }),
        )

        if (result.Messages && result.Messages.length > 0) {
          for (const message of result.Messages) {
            try {
              await this.handleMessage(message)
              await this.sqs.send(
                new DeleteMessageCommand({
                  QueueUrl: this.queueUrl,
                  ReceiptHandle: message.ReceiptHandle,
                }),
              )
            } catch (error) {
              this.logger.error(
                `Error processing message ${message.MessageId}`,
                error,
              )
            }
          }
        }
      } catch (error) {
        if (this.polling) {
          this.logger.error('Error polling SQS', error)
          await this.sleep(5000)
        }
      }
    }
  }

  private async handleMessage(message: any): Promise<void> {
    const body = JSON.parse(message.Body)

    // EventBridge wraps events in an envelope
    const detailType = body['detail-type'] || body.DetailType
    const detail = body.detail || body.Detail

    this.logger.log(`Received event: ${detailType}`)

    switch (detailType) {
      case 'PaymentCompleted':
        await this.handlePaymentCompleted(
          typeof detail === 'string' ? JSON.parse(detail) : detail,
        )
        break
      default:
        this.logger.log(`Ignoring event type: ${detailType}`)
    }
  }

  private async handlePaymentCompleted(detail: {
    paymentId: string
    budgetId: string
    serviceOrderId: string
    completedAt: string
  }): Promise<void> {
    this.logger.log(
      `Processing PaymentCompleted for order ${detail.serviceOrderId}`,
    )

    try {
      await this.createExecutionUseCase.execute({
        serviceOrderId: detail.serviceOrderId,
        budgetId: detail.budgetId,
        estimatedDuration: 60,
        notes: `Auto-created from payment ${detail.paymentId}`,
      })
      this.logger.log(
        `Execution auto-created for order ${detail.serviceOrderId}`,
      )
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('already exists')
      ) {
        this.logger.warn(
          `Execution already exists for order ${detail.serviceOrderId}, skipping`,
        )
      } else {
        throw error
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
