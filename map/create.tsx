import React from 'react';

export function createMapPage() {
  return (props: { id: string }) => (
    <div>Test map page - {props.id}</div>
  )
}
