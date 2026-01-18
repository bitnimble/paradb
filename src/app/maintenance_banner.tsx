import { colors, metrics } from 'ui/base/design_system/design_tokens';

export const MaintenanceBanner = (props: { message: string }) => {
  return (
    <div
      style={{
        backgroundColor: colors.red,
        color: colors.white,
        width: '100vw',
        height: metrics.gridBaseline * 6,
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
