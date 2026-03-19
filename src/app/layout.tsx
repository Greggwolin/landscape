import type { Metadata } from "next";
import { ReactNode } from "react";
import './globals.css';
import '@/styles/coreui-theme.css';
import '@/styles/budget-color-audit.css';
import '@/styles/navigation.css';
import '@/styles/sales-transactions.css';
import { CoreUIThemeProvider } from "@/app/components/CoreUIThemeProvider";
import { ProjectProvider } from "@/app/components/ProjectProvider";
import { QueryProvider } from "@/app/components/QueryProvider";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/contexts/AuthContext";
import NavigationLayout from "@/app/components/NavigationLayout";
import { HelpLandscaperProvider } from "@/contexts/HelpLandscaperContext";
import { LandscaperThinkingProvider } from "@/contexts/LandscaperThinkingContext";
// GuideModal removed — guide now opens in a separate browser window via window.open()
// Theme imports - currently using hybrid theme
// import ThemeRegistry from "./components/ThemeRegistry";
// Alternative: import { ThemeProvider } from '@/themes/mui-materio';

export const metadata: Metadata = {
  title: "Landscape (Alpha)",
  description: "UI/UX-first prototype with MUI shell",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthProvider>
            <CoreUIThemeProvider>
              <ToastProvider>
                <ProjectProvider>
                  <LandscaperThinkingProvider>
                    <HelpLandscaperProvider>
                      <NavigationLayout>
                        {children}
                      </NavigationLayout>
                    </HelpLandscaperProvider>
                  </LandscaperThinkingProvider>
                </ProjectProvider>
              </ToastProvider>
            </CoreUIThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
