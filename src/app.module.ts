import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ExecutionsModule } from '@application/executions/executions.module'
import { ExecutionsController } from '@interfaces/rest/controllers/executions.controller'
import { HealthController } from '@interfaces/rest/controllers/health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ExecutionsModule,
  ],
  controllers: [ExecutionsController, HealthController],
})
export class AppModule {}
