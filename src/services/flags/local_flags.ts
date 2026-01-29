import { Flags } from './flag_definitions';
import { Policy } from './flag_policies';

export const LocalFlags: Partial<{
  [K in keyof typeof Flags]: Policy<(typeof Flags)[K]['defaultValue']>;
}> = {
  showMaintenanceBanner: {
    policyType: 'global',
    value: false,
  },
  maintenanceBannerMessage: 'Maintenance banner message',
};
