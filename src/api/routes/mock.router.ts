import { RouterBroker } from '@api/abstract/abstract.router';
import { MockPhoneOnboardingDto } from '@api/dto/mockOnboarding.dto';
import { mockController } from '@api/server.module';
import { mockPhoneOnboardingSchema } from '@validate/mock-onboarding.schema';
import { RequestHandler, Router } from 'express';

import { HttpStatus } from './index.router';

export class MockRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router.post('/onboarding/phone', ...guards, async (req, res) => {
      const response = await this.dataValidate<MockPhoneOnboardingDto>({
        request: req,
        schema: mockPhoneOnboardingSchema,
        ClassRef: MockPhoneOnboardingDto,
        execute: (_, data) => mockController.phoneOnboarding(data),
      });

      return res.status(HttpStatus.CREATED).json(response);
    });
  }

  public readonly router: Router = Router();
}
