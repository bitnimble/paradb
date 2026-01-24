import { createEdgeConfigAdapter } from '@flags-sdk/edge-config';
import { Adapter } from 'flags';
import { flag } from 'flags/next';
import { getEnvVars } from 'services/env';
import z from 'zod';
import { getLog } from './logging/server_logger';

const log = getLog(['flags']);

const createTypedAdapter = <T, EntitiesType>(schema: z.ZodType<T>, defaultValue: T) => {
  const envVars = getEnvVars();
  const edgeConfigAdapter = createEdgeConfigAdapter(envVars.flagsEdgeConfig, {
    edgeConfigItemKey: envVars.flagsEdgeConfigKey,
  })();

  return (): Adapter<T, EntitiesType> => {
    return {
      origin: edgeConfigAdapter.origin,
      async decide(opts): Promise<T> {
        try {
          const value = await edgeConfigAdapter.decide(opts);
          if (value == null) {
            return opts.defaultValue || defaultValue;
          }

          const result = schema.safeParse(value);
          if (result.success) {
            return result.data;
          }

          const errorMessage = `Unable to parse value for flag ${opts.key}, ${result.error.message}: ${JSON.stringify(value)}`;
          log.error(errorMessage);
          throw new Error(errorMessage);
        } catch {
          return opts.defaultValue || defaultValue;
        }
      },
    };
  };
};

const string = createTypedAdapter(z.string(), '');
const boolean = createTypedAdapter(z.boolean(), false);

export const flagShowMaintenanceBanner = flag({
  key: 'showMaintenanceBanner',
  adapter: boolean(),
});
export const flagMaintenanceBannerMessage = flag({
  key: 'maintenanceBannerMessage',
  adapter: string(),
});
