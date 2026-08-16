import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";


export const metadata: Metadata = {
  title: "VHQ — The Vinyl Headquarters",
  description: "Discover. Collect. Connect. The ultimate vinyl community platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/>
      </head>
      <body>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}