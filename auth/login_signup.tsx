import React from 'react';

type LoginSignupProps = {
  Username: React.ComponentType,
  Password: React.ComponentType,
  login(): void,
}

export const LoginSignup = (({ Username, Password, login }: LoginSignupProps) => {
  return (
    <div>
      <Username/>
      <Password/>
      <button onClick={login}></button>
    </div>
  );
});
