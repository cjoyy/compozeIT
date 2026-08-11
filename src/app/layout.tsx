import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { RoleProvider } from "@/components/role-provider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CompozeIT — AI-Powered Food Waste Redistribution",
  description:
    "Platform cerdas untuk mengalihkan sampah makanan dari TPA melalui AI classification, circular processing, dan marketplace hasil olahan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <RoleProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border/40 bg-muted/30 py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
              <p className="text-xs text-muted-foreground">
                © 2026 CompozeIT — AI-Powered Food Waste Redistribution &amp; Circular Processing
              </p>
            </div>
          </footer>
        </RoleProvider>
      </body>
    </html>
  );
}
