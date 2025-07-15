import "./globals.css";
import { ThemeProvider } from "@/hooks/useTheme";
import { AppSettingsProvider } from "@/hooks/useAppSettings";

export const metadata = {
  title: "iTodo - Your Focus Companion",
  description: "A minimalist four-quadrant to-do list application.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <ThemeProvider>
          <AppSettingsProvider>{children}</AppSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
