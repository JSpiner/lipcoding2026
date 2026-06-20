import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "말그림 | SpeakDraw",
  description: "말하면 그려지는 다이어그램",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}