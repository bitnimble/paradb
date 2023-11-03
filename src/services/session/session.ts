import { getEnvVars } from 'services/env';
import { User } from 'services/users/users_repo';
import { sealData, unsealData } from 'iron-session';
import { cookies } from 'next/headers';
import { UserSession, deserializeUserSession, serializeUserSession } from 'schema/users';

type IronSessionData = {
  paradbSession: {
    userSession: UserSession;
  };
};

export function createSessionFromUser(user: User): UserSession {
  const { id, username, accountStatus, email } = user;
  return { id, username, accountStatus, email };
}

export async function getUserSession(): Promise<UserSession | undefined> {
  const envVars = getEnvVars();
  const cookieName = envVars.cookieName;
  const cookie = cookies().get(cookieName);

  if (!cookie) {
    return;
  }

  const { paradbSession } = await unsealData<IronSessionData>(cookie.value, {
    password: envVars.cookieSecret,
  });
  if (paradbSession == null) {
    return;
  }

  // Round-trip it through the schema serializers to validate and strip excess properties
  return deserializeUserSession(serializeUserSession(paradbSession.userSession));
}

export async function setUserSession(_session: UserSession) {
  const envVars = getEnvVars();
  const cookieName = envVars.cookieName;

  // Round-trip it through the schema serializers to validate and strip excess properties
  const userSession = deserializeUserSession(serializeUserSession(_session));
  const data: IronSessionData = { paradbSession: { userSession } };
  const cookieValue = await sealData(data, {
    password: envVars.cookieSecret,
  });

  cookies().set(cookieName, cookieValue);
}

export function clearUserSession() {
  const envVars = getEnvVars();
  const cookieName = envVars.cookieName;
  cookies().delete(cookieName);
}
