import { SignupRequest, SignupResponse } from 'schema/users';
import supertest from 'supertest';
import { z } from 'zod';

// It's a function in order to defer execution until after the beforeAll() step has run
export const testServer = () => supertest('http://localhost:3000');

export const testPost = async <Req, Res>(
  url: string,
  requestSchema: z.ZodType<Req>,
  responseSchema: z.ZodType<Res>,
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
    .send(JSON.stringify(requestSchema.parse(body)));

  return responseSchema.parse(JSON.parse(resp.body));
};

export const testGet = async <Res>(
  url: string,
  responseSchema: z.ZodType<Res>,
  cookie?: string
) => {
  const req = testServer().get(url);
  if (cookie != null) {
    req.set('Cookie', cookie);
  }
  const resp = await req.type('application/json').responseType('application/json');
  return responseSchema.parse(JSON.parse(resp.body));
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
    .type('application/json')
    .responseType('application/json')
    .send(
      JSON.stringify(
        SignupRequest.parse(
          user ?? {
            email: testUser.email,
            password: testUser.password,
            username: testUser.username,
          }
        )
      )
    );

  expect(SignupResponse.parse(JSON.parse(resp.body))).toEqual({ success: true });

  return resp.headers['set-cookie'];
};
