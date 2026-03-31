import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

export const mockPhoneOnboardingSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    phoneNumber: { type: 'string', minLength: 10 },
    customerName: { type: 'string' },
    plan: { type: 'string' },
    instanceName: { type: 'string' },
    autoCreateInstance: { type: 'boolean' },
    autoConnect: { type: 'boolean' },
  },
  required: ['phoneNumber'],
};
