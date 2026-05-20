import { Module } from '@nestjs/common';
import { RiskInferenceClient } from './risk-inference.client';
import { RiskScoringService } from './risk-scoring.service';

@Module({
  providers: [RiskInferenceClient, RiskScoringService],
  exports: [RiskScoringService, RiskInferenceClient],
})
export class AnalyticsModule {}
