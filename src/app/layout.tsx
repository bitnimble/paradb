import { ApiProvider } from 'app/api/api_provider';
import { MaintenanceBanner } from 'app/maintenance_banner';
import { SkeletonProvider } from 'app/skeleton_provider';
import type { Metadata } from 'next';
import { Flags } from 'services/flags/flag_definitions';
import { getUserSession } from 'services/session/session';
import { colors } from 'ui/base/design_system/design_tokens';
import { ThemeProvider } from 'ui/base/theme/theme_provider';
import { ToastProvider } from 'ui/base/toast/toast';
import { NavBar } from 'ui/nav_bar/nav_bar';
import { SessionProvider } from 'ui/session/session_provider';
import './globals.css';
import styles from './layout.module.css';

export const metadata: Metadata = {
  title: 'ParaDB',
  // Note: do not use getEnvVars() here as it isn't available yet
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://paradb.net'),
};

export const viewport = {
  themeColor: colors.accent,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getUserSession();
  const showBanner = await Flags.showMaintenanceBanner();
  const bannerMessage = await Flags.maintenanceBannerMessage();
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ApiProvider>
            <SessionProvider session={session}>
              <SkeletonProvider className={styles.skeleton}>
                {showBanner ? <MaintenanceBanner message={bannerMessage} /> : null}
                <NavBar />
                <div className={styles.content}>{children}</div>
                <ToastProvider />
              </SkeletonProvider>
            </SessionProvider>
          </ApiProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
