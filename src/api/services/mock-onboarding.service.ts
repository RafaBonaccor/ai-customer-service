import { MockPhoneOnboardingDto } from '@api/dto/mockOnboarding.dto';
import { PrismaRepository } from '@api/repository/repository.service';
import { Logger } from '@config/logger.config';
import { BadRequestException } from '@exceptions';

type PreparedMockOnboarding = {
  customerName: string | null;
  plan: string;
  normalizedPhoneNumber: string;
  instanceName: string;
  autoCreateInstance: boolean;
  autoConnect: boolean;
  existingInstance: {
    id: string;
    name: string;
    number: string | null;
    integration: string | null;
    connectionStatus: string;
  } | null;
};

export class MockOnboardingService {
  constructor(private readonly prismaRepository: PrismaRepository) {}

  private readonly logger = new Logger('MockOnboardingService');

  private normalizePhoneNumber(phoneNumber: string) {
    const normalized = String(phoneNumber || '').replace(/\D/g, '');

    if (normalized.length < 10) {
      throw new BadRequestException('phoneNumber must contain at least 10 digits');
    }

    return normalized;
  }

  private buildInstanceName(instanceName: string | undefined, phoneNumber: string) {
    if (instanceName && instanceName.trim()) {
      return instanceName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    }

    const suffix = phoneNumber.slice(-8);
    return `mock-${suffix}`;
  }

  public async preparePhoneOnboarding(data: MockPhoneOnboardingDto): Promise<PreparedMockOnboarding> {
    const normalizedPhoneNumber = this.normalizePhoneNumber(data.phoneNumber);
    const instanceName = this.buildInstanceName(data.instanceName, normalizedPhoneNumber);
    const plan = data.plan?.trim() || 'starter';
    const customerName = data.customerName?.trim() || null;
    const autoCreateInstance = data.autoCreateInstance !== false;
    const autoConnect = data.autoConnect === true;

    const existingInstance = await this.prismaRepository.instance.findFirst({
      where: {
        OR: [{ name: instanceName }, { number: normalizedPhoneNumber }],
      },
      select: {
        id: true,
        name: true,
        number: true,
        integration: true,
        connectionStatus: true,
      },
    });

    this.logger.log(
      `Mock onboarding prepared for ${normalizedPhoneNumber} -> instance=${instanceName}, existing=${!!existingInstance}`,
    );

    return {
      customerName,
      plan,
      normalizedPhoneNumber,
      instanceName,
      autoCreateInstance,
      autoConnect,
      existingInstance: existingInstance
        ? {
            ...existingInstance,
            connectionStatus: String(existingInstance.connectionStatus),
          }
        : null,
    };
  }
}
