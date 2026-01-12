import { ApiProvider } from 'app/api/api_provider';
import { MaintenanceBanner } from 'app/maintenance_banner';
import type { Metadata } from 'next';
import { getFlags } from 'services/server_context';
import { SessionProvider } from 'session/session_provider';
import { colors } from 'ui/base/design_system/design_tokens';
import { ThemeProvider } from 'ui/base/theme';
import { NavBar } from 'ui/nav_bar/nav_bar';
import './globals.css';
import styles from './layout.module.css';

export const metadata: Metadata = {
  title: 'ParaDB',
  metadataBase: new URL(process.env.BASE_URL || 'http://localhost:3000'),
};

export const viewport = {
  themeColor: colors.purple,
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const flags = getFlags();
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
