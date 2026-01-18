import React from 'react';
import { Dialog } from 'ui/base/dialog/dialog';

export function createDialog(Body: React.ComponentType, onClose: () => void) {
  return () => <Dialog Body={Body} onClose={onClose}></Dialog>;
}
