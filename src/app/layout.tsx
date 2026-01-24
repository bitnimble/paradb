import { ApiProvider } from 'app/api/api_provider';
import { MaintenanceBanner } from 'app/maintenance_banner';
import { SkeletonProvider } from 'app/skeleton_provider';
import type { Metadata } from 'next';
import { flagMaintenanceBannerMessage, flagShowMaintenanceBanner } from 'services/flags';
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
  metadataBase: new URL(process.env.BASE_URL || 'http://localhost:3000'),
};

export const viewport = {
  themeColor: colors.purple,
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getUserSession();
  const showBanner = await flagShowMaintenanceBanner();
  const bannerMessage = await flagMaintenanceBannerMessage();
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
