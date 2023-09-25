import { testPost, testUser, testUser2 } from 'services/jest_helpers';
import { SignupRequest, serializeSignupRequest, deserializeSignupResponse } from 'schema/users';

describe('signup handler', () => {
  const signup = (body: SignupRequest) =>
    testPost('/api/users/signup', serializeSignupRequest, deserializeSignupResponse, body);

  it('allows users to sign up', async () => {
    const resp1 = await signup({
      email: testUser.email,
      password: testUser.password,
      username: testUser.username,
    });
    const resp2 = await signup({
      email: testUser2.email,
      password: testUser2.password,
      username: testUser2.username,
    });
    expect(resp1).toEqual({ success: true });
    expect(resp2).toEqual({ success: true });
  });

  it('does not allow users to sign up with the same username', async () => {
    const resp1 = await signup({
      email: testUser.email,
      password: testUser2.password,
      username: testUser.username,
    });
    const resp2 = await signup({
      email: testUser2.email,
      password: testUser2.password,
      username: testUser.username,
    });

    expect(resp1).toEqual({ success: true });
    expect(resp2).toEqual({
      success: false,
      statusCode: 400,
      username: 'This username has already been taken',
      errorMessage: '',
    });
  });

  it('does not allow users to sign up with the same email address', async () => {
    const resp1 = await signup({
      email: testUser.email,
      password: testUser.password,
      username: testUser.username,
    });
    const resp2 = await signup({
      email: testUser.email,
      password: testUser2.password,
      username: testUser2.username,
    });

    expect(resp1).toEqual({ success: true });
    expect(resp2).toEqual({
      success: false,
      statusCode: 400,
      email: 'This email has already been registered',
      errorMessage: '',
    });
  });

  it('does not allow weak passwords', async () => {
    const responses = await Promise.all([
      signup({ email: testUser.email, password: 'v1n98', username: testUser.username }),
      signup({ email: testUser.email, password: 'password', username: testUser.username }),
      signup({ email: testUser.email, password: '12345678', username: testUser.username }),
      signup({ email: testUser.email, password: 'testtest', username: testUser.username }),
    ]);
    const weakPasswordError = { success: false, statusCode: 400, errorMessage: '' };
    expect(responses).toEqual([
      { ...weakPasswordError, password: 'Your password is too short' },
      { ...weakPasswordError, password: 'This is a top-10 common password' },
      { ...weakPasswordError, password: 'This is a top-10 common password' },
      {
        ...weakPasswordError,
        password: 'Repeats like "abcabcabc" are only slightly harder to guess than "abc"',
      },
    ]);
  });
});
