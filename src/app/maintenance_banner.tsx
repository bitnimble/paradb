import React from 'react';
import colorStyles from 'ui/base/colors/colors.module.css';
import { gridBaseline } from 'ui/base/metrics/metrics';

export const MaintenanceBanner = (props: { message: string }) => {
  return (
    <div
      style={{
        backgroundColor: colorStyles.colorRed,
        color: colorStyles.colorWhite,
        width: '100vw',
        height: gridBaseline * 6,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '1.2rem',
      }}
    >
      <p>{props.message}</p>
    </div>
  );
};
