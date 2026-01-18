'use client';

import React, { RefObject, createContext, useContext, useRef } from 'react';

type SkeletonContextValue = RefObject<HTMLDivElement | null>;

const SkeletonContext = createContext<SkeletonContextValue | null>(null);

export function useSkeletonRef(): SkeletonContextValue {
  const context = useContext(SkeletonContext);
  if (!context) {
    throw new Error('useSkeletonRef must be used within a SkeletonProvider');
  }
  return context;
}

export function SkeletonProvider({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  const skeletonRef = useRef<HTMLDivElement | null>(null);

  return (
    <SkeletonContext.Provider value={skeletonRef}>
      <div ref={skeletonRef} className={className}>
        {children}
      </div>
    </SkeletonContext.Provider>
  );
}
