import { deserializeSignupResponse, serializeSignupRequest } from 'schema/users';
import supertest from 'supertest';

// It's a function in order to defer execution until after the beforeAll() step has run
export const testServer = () => supertest('http://localhost:3000');

export const testPost = async <Req, Res>(
  url: string,
  serializer: (t: Req) => string,
  deserializer: (s: string) => Res,
  body: Req,
  cookie?: string
) => {
  const req = testServer().post(url);
  if (cookie != null) {
    req.set('Cookie', cookie);
  }
  const resp = await req
    .type('application/json')
    .responseType('application/json')
    .send(serializer(body));

  return deserializer(resp.body);
};

export const testGet = async <Res>(
  url: string,
  deserialize: (s: string) => Res,
  cookie?: string
) => {
  const req = testServer().get(url);
  if (cookie != null) {
    req.set('Cookie', cookie);
  }
  const resp = await req.type('application/json').responseType('application/json');
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
    .responseType('application/octet-stream')
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
