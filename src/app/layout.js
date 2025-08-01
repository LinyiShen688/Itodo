import "./globals.css";
import { ThemeProvider } from "@/hooks/useTheme";
import { AppSettingsProvider } from "@/hooks/useAppSettings";
import ToastContainer from "@/components/ToastContainer";

export const metadata = {
  title: "iTodo - Your Focus Companion",
  description: "A minimalist four-quadrant to-do list application.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('iTodo-theme');
                  const theme = stored ? JSON.parse(stored) : 'minimal';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'minimal');
                }
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning={true}>
        <ThemeProvider>
          <AppSettingsProvider>
            {children}
            <ToastContainer />
          </AppSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
