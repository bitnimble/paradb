import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getEnvVars } from 'services/env';

const stringFlag = (defaultValue: string) =>
  ({
    type: 'string',
    defaultValue,
  }) as const;
const booleanFlag = (defaultValue: boolean) =>
  ({
    type: 'boolean',
    defaultValue,
  }) as const;

const flagDefaults = {
  ['showMaintenanceBanner']: booleanFlag(false),
  ['maintenanceBannerMessage']: stringFlag(
    'ParaDB will soon be going down for maintenance. Downtime is expected to last for approximately 1 hour.'
  ),
};
const flagKeys = new Set(Object.keys(flagDefaults));
export type FlagKey = keyof typeof flagDefaults;

type FlagStore = {
  [K in keyof typeof flagDefaults]: (typeof flagDefaults)[K] & {
    value?: (typeof flagDefaults)[K]['defaultValue'];
  };
};

export class Flags {
  private flags: FlagStore = structuredClone(flagDefaults);
  private s3client = this.createS3Client();

  constructor() {
    this.updateFlags();
    setInterval(
      () => {
        this.updateFlags();
      },
      1000 * 60 * 1
    ); // every 5 mins
  }

  private createS3Client() {
    try {
      const envVars = getEnvVars();
      return new S3Client({
        endpoint: envVars.dynamicConfigEndpoint,
        region: 'auto',
        credentials: {
          accessKeyId: envVars.dynamicConfigAccessKeyId,
          secretAccessKey: envVars.dynamicConfigSecretKey,
        },
        forcePathStyle: true,
      });
    } catch (e) {
      console.warn('Failed to create S3 client for Flags, dynamic flags will be disabled');
      return null;
    }
  }

  private updateFlags = async () => {
    if (!this.s3client) {
      return;
    }
    const envVars = getEnvVars();
    try {
      const resp = await this.s3client.send(
        new GetObjectCommand({
          Bucket: envVars.dynamicConfigBucket,
          Key: envVars.dynamicConfigRepoFile,
        })
      );
      const body = await resp.Body?.transformToString();
      if (!body) {
        console.error('Failed to read dynamic-config file');
        return;
      }
      const flags = JSON.parse(body);
      for (const [key, value] of Object.entries(flags.global)) {
        if (!flagKeys.has(key)) {
          continue;
        }
        const flagKey = key as FlagKey;
        const descriptor = flagDefaults[flagKey];
        if (value === null) {
          // If the flag has explicitly been cleared in dynamic-config, we can reset it in the store.
          this.flags[flagKey].value = undefined;
        }
        if (typeof value !== descriptor.type) {
          continue;
        }
        if (this.flags[flagKey].value !== value) {
          console.log(`Updated flag ${flagKey} to ${value}`);
        }
        this.flags[flagKey].value = value as any;
      }
    } catch (e) {
      console.error(`Failed to update flags: ${e}`);
      return;
    }
  };

  get<K extends FlagKey>(key: K): (typeof flagDefaults)[K]['defaultValue'] {
    return this.flags[key].value ?? this.flags[key].defaultValue;
  }
}
