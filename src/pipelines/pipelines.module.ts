import { Module } from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import { PipelinesController } from './pipelines.controller';

@Module({
  controllers: [PipelinesController],
  providers: [PipelinesService],
})
export class PipelinesModule {}
