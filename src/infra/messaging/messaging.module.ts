import { Module, forwardRef } from '@nestjs/common'
import { EventBridgeEventPublisherService } from './eventbridge-event-publisher.service'
import { SqsEventConsumerService } from './sqs-event-consumer.service'
import { ExecutionsModule } from '@application/executions/executions.module'

@Module({
  imports: [forwardRef(() => ExecutionsModule)],
  providers: [
    {
      provide: 'IEventPublisher',
      useClass: EventBridgeEventPublisherService,
    },
    SqsEventConsumerService,
  ],
  exports: ['IEventPublisher'],
})
export class MessagingModule {}
