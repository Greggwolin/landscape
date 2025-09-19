import type { Metadata } from "next";
import { ReactNode } from "react";
import './globals.css';  // Add this line
// import ThemeRegistry from "./components/ThemeRegistry";

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
        {children}
      </body>
    </html>
  );
}
