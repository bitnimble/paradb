import 'server-only';
import { booleanFlag, stringFlag } from './flag_policies';

export const Flags = {
  showMaintenanceBanner: booleanFlag('showMaintenanceBanner'),
  maintenanceBannerMessage: stringFlag('maintenanceBannerMessage'),
};
