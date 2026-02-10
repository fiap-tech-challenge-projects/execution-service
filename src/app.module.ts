import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { ExecutionsModule } from '@application/executions/executions.module'
import { ExecutionsController } from '@interfaces/rest/controllers/executions.controller'
import { HealthController } from '@interfaces/rest/controllers/health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/executions',
    ),
    ExecutionsModule,
  ],
  controllers: [ExecutionsController, HealthController],
})
export class AppModule {}
