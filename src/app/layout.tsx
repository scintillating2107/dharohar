import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} — Land Record Digitization Portal`,
  description: APP_DESCRIPTION,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
