import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="th"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link href="https://fonts.googleapis.com/css2?family=Calistoga&family=Inter:wght@400;500;700&family=Material+Symbols+Outlined" rel="stylesheet" /></head><body>{children}</body></html>; }
