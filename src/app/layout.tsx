import type { Metadata, Viewport } from "next";
import { DeviceProvider } from "@/components/device-context";
import { APP_DEFINITION, APP_NAME } from "@/lib/divisions";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_NAME}. ${APP_DEFINITION}. Browser-only. No account and no server.`,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-dvh bg-background text-foreground">
        <DeviceProvider>{children}</DeviceProvider>
      </body>
    </html>
  );
}
