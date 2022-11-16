import { Dialog } from 'pages/paradb/base/dialog/dialog';
import React from 'react';

export function createDialog(Body: React.ComponentType, onClose: () => void) {
  return () => <Dialog Body={Body} onClose={onClose}></Dialog>;
}
