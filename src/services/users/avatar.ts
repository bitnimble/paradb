import { getEnvVars } from 'services/env';

export const avatarKey = (userId: string) => `avatars/${userId}.png`;

// cacheToken is an opaque cache-buster: a fresh value on each change yields a new URL so the CDN
// serves the new image.
export function buildAvatarUrl(userId: string, cacheToken: string): string {
  return `${getEnvVars().publicAssetsBaseUrl}/${avatarKey(userId)}?v=${cacheToken}`;
}
