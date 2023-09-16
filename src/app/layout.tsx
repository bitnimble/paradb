import { SessionProvider } from 'session/session_provider';
import './globals.css';
import type { Metadata } from 'next';
import { ApiProvider } from 'api/api_provider';
import { NavBar } from 'ui/nav_bar/nav_bar';
import styles from './layout.module.css';

export const metadata: Metadata = {
  title: 'ParaDB',
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
