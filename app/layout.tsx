import type { Metadata } from "next";
import "./globals.css";
import "material-symbols/outlined.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { SettingsProvider } from "@/context/settings-context";

export const metadata: Metadata = {
  title: "TocLog Control System",
  description: "Transport and Delivery Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SettingsProvider>
              {children}
              <Toaster />
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
