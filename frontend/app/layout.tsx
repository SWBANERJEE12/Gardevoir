import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gardevoir",
  description: "Intelligent security testing. Uncover vulnerabilities before they become liabilities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#02040b] text-white antialiased selection:bg-white/20">
        {children}
      </body>
    </html>
  );
}
