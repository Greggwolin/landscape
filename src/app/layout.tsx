import type { Metadata } from "next";
import { ReactNode } from "react";
import './globals.css';
import '@/styles/coreui-theme.css';
import '@/styles/budget-color-audit.css';
import { IssueReporterProvider } from "@/components/IssueReporter";
import { CoreUIThemeProvider } from "@/app/components/CoreUIThemeProvider";
import { ProjectProvider } from "@/app/components/ProjectProvider";
import { QueryProvider } from "@/app/components/QueryProvider";
import { ToastProvider } from "@/components/ui/toast";
import NavigationLayout from "@/app/components/NavigationLayout";
// Theme imports - currently using hybrid theme
// import ThemeRegistry from "./components/ThemeRegistry";
// Alternative: import { ThemeProvider } from '@/themes/mui-materio';

export const metadata: Metadata = {
  title: "Landscape (Materio Skin)",
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
          <CoreUIThemeProvider>
            <ToastProvider>
              <ProjectProvider>
                <IssueReporterProvider>
                  <NavigationLayout>
                    {children}
                  </NavigationLayout>
                </IssueReporterProvider>
              </ProjectProvider>
            </ToastProvider>
          </CoreUIThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
