import { createClient } from '@vercel/edge-config';
import { UnreachableError } from 'base/unreachable';
import { Adapter } from 'flags';
import { dedupe, flag } from 'flags/next';
import { UserSession } from 'schema/users';
import { getEnvVars } from 'services/env';
import z from 'zod';
import { getLog } from '../logging/server_logger';
import { getUserSession } from '../session/session';
import { LocalFlags } from './local_flags';

type FlagValueType = string | boolean | undefined;

const log = getLog(['flags']);

const globalPolicy = z.object({
  policyType: z.literal('global'),
});
const staffPolicy = z.object({
  policyType: z.literal('staff'),
});
const emailPolicy = z.object({
  policyType: z.literal('email'),
  emails: z.array(z.email()),
});
const policy = z.discriminatedUnion('policyType', [globalPolicy, staffPolicy, emailPolicy]);
export type Policy<T extends FlagValueType = FlagValueType> =
  | (z.infer<typeof policy> & { value: T })
  | T;

const getCachedRequestContext = dedupe(() => {
  return getUserSession();
});

const createFlagConfigStore = () => {
  const envVars = getEnvVars();
  if (envVars.flagsImplementation === 'edge-config') {
    const config = createClient(envVars.flagsEdgeConfig);
    return {
      origin: envVars.flagsEdgeConfig,
      getPolicy: async (key: string) => {
        const flags = await config.get<Record<string, Policy>>(envVars.flagsEdgeConfigKey);
        return flags?.[key];
      },
    };
  } else if (envVars.flagsImplementation === 'local') {
    return {
      origin: 'local',
      getPolicy: (key: string) => {
        return (LocalFlags as Record<string, Policy>)[key];
      },
    };
  } else {
    throw new Error('Unknown flags implementation: ' + envVars.flagsImplementation);
  }
};

const createTypedAdapter = <T>(schema: z.ZodType<T>, typeDefaultValue: T) => {
  const flagStore = createFlagConfigStore();
  const policySchema = z.intersection(policy, z.object({ value: schema }));

  return (): Adapter<T, UserSession> => {
    return {
      origin: flagStore.origin,
      identify() {
        return getCachedRequestContext();
      },
      async decide(opts): Promise<T> {
        const defaultValue = opts.defaultValue ?? typeDefaultValue;
        try {
          const value = await flagStore.getPolicy(opts.key);
          if (value == null) {
            return defaultValue;
          }

          const policyResult = policySchema.safeParse(value);
          if (!policyResult.success) {
            // Attempt to parse it as a global policy value instead
            const valueResult = schema.safeParse(value);
            if (valueResult.success) {
              return valueResult.data;
            }

            log.error(
              `Unable to parse value for flag ${opts.key}, ${policyResult.error.message}: ${JSON.stringify(value)}`
            );
            return defaultValue;
          }
          const policy = policyResult.data;

          switch (policy.policyType) {
            case 'global':
              return policy.value;
            case 'staff': {
              const email = opts.entities?.email;
              if (email?.endsWith('@brief.case')) {
                return policy.value;
              }
              return defaultValue;
            }
            case 'email': {
              const email = opts.entities?.email;
              if (email && policy.emails.includes(email)) {
                return policy.value;
              }
              return defaultValue;
            }
            default:
              log.error(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                `Unhandled policy type: ${(policy as any).policyType}`
              );
              throw new UnreachableError(policy);
          }
        } catch {
          return defaultValue;
        }
      },
    };
  };
};

export const stringFlagAdapter = createTypedAdapter(z.string(), '');
export const booleanFlagAdapter = createTypedAdapter(z.boolean(), false);

export const stringFlag = (flagKey: string) =>
  flag({
    key: flagKey,
    adapter: stringFlagAdapter(),
  });
export const booleanFlag = (flagKey: string) =>
  flag({
    key: flagKey,
    adapter: booleanFlagAdapter(),
  });
