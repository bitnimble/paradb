import { ApiProvider } from 'app/api/api_provider';
import type { Metadata } from 'next';
import { getFlags } from 'services/server_context';
import { SessionProvider } from 'session/session_provider';
import colorStyles from 'ui/base/colors/colors.module.css';
import { NavBar } from 'ui/nav_bar/nav_bar';
import './globals.css';
import styles from './layout.module.css';
import { MaintenanceBanner } from 'app/maintenance_banner';

export const metadata: Metadata = {
  title: 'ParaDB',
};

export const viewport = {
  themeColor: colorStyles.colorPurple,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const flags = getFlags();
  return (
    <html lang="en">
      <body>
        <ApiProvider>
          <SessionProvider>
            <div className={styles.skeleton}>
              {flags.get('showMaintenanceBanner') ? (
                <MaintenanceBanner message={flags.get('maintenanceBannerMessage')} />
              ) : null}
              <NavBar />
              <div className={styles.content}>{children}</div>
            </div>
          </SessionProvider>
        </ApiProvider>
      </body>
    </html>
  );
}
