import React from 'react';

export default function MdxLayout({ children }: React.PropsWithChildren) {
  return (
    <div
      style={{
        margin: 'auto',
        maxWidth: 'calc(var(--gridBaseline) * 120)',
      }}
    >
      {children}
    </div>
  );
}
