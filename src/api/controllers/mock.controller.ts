import { InstanceController } from '@api/controllers/instance.controller';
import { InstanceDto } from '@api/dto/instance.dto';
import { MockPhoneOnboardingDto } from '@api/dto/mockOnboarding.dto';
import { MockOnboardingService } from '@api/services/mock-onboarding.service';
import { Integration } from '@api/types/wa.types';

export class MockController {
  constructor(
    private readonly mockOnboardingService: MockOnboardingService,
    private readonly instanceController: InstanceController,
  ) {}

  public async phoneOnboarding(data: MockPhoneOnboardingDto) {
    const prepared = await this.mockOnboardingService.preparePhoneOnboarding(data);

    let instanceResult: any = null;
    let connectionResult: any = null;
    let instanceCreated = false;
    let instanceName = prepared.existingInstance?.name || prepared.instanceName;

    if (!prepared.existingInstance && prepared.autoCreateInstance) {
      const instancePayload: InstanceDto = {
        instanceName: prepared.instanceName,
        number: prepared.normalizedPhoneNumber,
        integration: Integration.WHATSAPP_BAILEYS,
        qrcode: false,
        rejectCall: false,
        groupsIgnore: false,
        alwaysOnline: false,
        readMessages: false,
        readStatus: false,
        syncFullHistory: false,
      };

      instanceResult = await this.instanceController.createInstance(instancePayload);
      instanceCreated = true;
      instanceName = instanceResult?.instance?.instanceName || prepared.instanceName;
    }

    if (prepared.autoConnect && (prepared.existingInstance || instanceCreated)) {
      connectionResult = await this.instanceController.connectToWhatsapp({
        instanceName,
        number: prepared.normalizedPhoneNumber,
      });
    }

    const connectionState =
      prepared.existingInstance || instanceCreated
        ? await this.instanceController.connectionState({ instanceName })
        : { instance: { instanceName, state: 'not_created' } };

    return {
      mock: true,
      stage: 'phone_collected',
      customer: {
        name: prepared.customerName,
        phoneNumber: prepared.normalizedPhoneNumber,
      },
      subscription: {
        status: 'active',
        plan: prepared.plan,
        paymentMode: 'mock',
      },
      instance: {
        created: instanceCreated,
        alreadyExisted: !!prepared.existingInstance,
        instanceName,
        integration:
          prepared.existingInstance?.integration || instanceResult?.instance?.integration || Integration.WHATSAPP_BAILEYS,
        number: prepared.normalizedPhoneNumber,
        state: connectionState?.instance?.state || 'unknown',
      },
      provisioning: {
        autoCreateInstance: prepared.autoCreateInstance,
        autoConnect: prepared.autoConnect,
      },
      nextStep: prepared.autoConnect
        ? 'Scan QR or use pairing flow to finish the WhatsApp connection'
        : 'Call the connect endpoint when you want to start the WhatsApp pairing step',
      links: {
        connect: `/instance/connect/${instanceName}?number=${prepared.normalizedPhoneNumber}`,
        connectionState: `/instance/connectionState/${instanceName}`,
      },
      debug: {
        createInstance: instanceResult,
        connect: connectionResult,
      },
    };
  }
}
