import crypto from 'crypto';

const MAX_ID_GEN_ATTEMPTS = 10;
export const enum IdDomain {
  USERS = 'U',
  MAPS = 'M',
}
const ID_LENGTH = 6;
function idGen(domain: IdDomain) {
  return domain + crypto
    .randomBytes(Math.ceil(ID_LENGTH / 2))
    .toString('hex')
    .slice(0, ID_LENGTH)
    .toUpperCase();
}

export async function generateId(
  domain: IdDomain,
  testExistence: (id: string) => Promise<boolean>,
): Promise<string | undefined> {
  // Create user ID
  let id = idGen(domain);
  for (let i = 0; i < MAX_ID_GEN_ATTEMPTS; i++) {
    // Regenerate ID if it matched a user
    if ((await testExistence(id))) {
      id = idGen(domain);
    } else if (i === MAX_ID_GEN_ATTEMPTS - 1) {
      return undefined;
    } else {
      break;
    }
  }
  return id;
}
