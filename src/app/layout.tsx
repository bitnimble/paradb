import { ApiProvider } from 'app/api/api_provider';
import type { Metadata } from 'next';
import { SessionProvider } from 'session/session_provider';
import colorStyles from 'ui/base/colors/colors.module.css';
import { NavBar } from 'ui/nav_bar/nav_bar';
import './globals.css';
import styles from './layout.module.css';

export const metadata: Metadata = {
  title: 'ParaDB',
  themeColor: colorStyles.colorPurple,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ApiProvider>
          <SessionProvider>
            <div className={styles.skeleton}>
              <NavBar />
              <div className={styles.content}>{children}</div>
            </div>
          </SessionProvider>
        </ApiProvider>
      </body>
    </html>
  );
}
