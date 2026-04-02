import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EVC Tutor Schedule",
  description:
    "Find FREE tutoring help for your courses at Evergreen Valley College",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
