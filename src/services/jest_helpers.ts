import { serializeSignupRequest, deserializeSignupResponse } from 'schema/users';
import supertest from 'supertest';

// It's a function in order to defer execution until after the beforeAll() step has run
export const testServer = () => supertest((global as any).server);

export const testPost = async <Req, Res>(
  url: string,
  serializer: (t: Req) => Uint8Array,
  deserializer: (b: Uint8Array) => Res,
  body: Req,
  cookie?: string
) => {
  const builder = testServer().post(url);
  if (cookie != null) {
    builder.set('Cookie', cookie);
  }
  const resp = await builder.type('application/octet-stream').send(serializer(body));

  return deserializer(resp.body);
};

export const testGet = async <Res>(
  url: string,
  deserialize: (b: Uint8Array) => Res,
  cookie?: string
) => {
  const builder = testServer().get(url);
  if (cookie != null) {
    builder.set('Cookie', cookie);
  }
  const resp = await builder.type('application/octet-stream');
  return deserialize(resp.body);
};

/**
 * Signs up as a test user and returns the Cookie header
 */
export const testUser = {
  username: 'test',
  email: 'test@test.com',
  password: 'Alive-Parabola7-Stump',
};
export const testUser2 = {
  username: 'test2',
  email: 'test2@test.com',
  password: 'Sessions-Blurb-Dealing1',
};
export const testAuthenticate = async (user?: {
  username: string;
  email: string;
  password: string;
}) => {
  const resp = await testServer()
    .post('/api/users/signup')
    .type('application/octet-stream')
    .send(
      serializeSignupRequest(
        user ?? {
          email: testUser.email,
          password: testUser.password,
          username: testUser.username,
        }
      )
    );

  expect(deserializeSignupResponse(resp.body)).toEqual({ success: true });

  return resp.headers['set-cookie'];
};
