import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/outfit";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "FluentFive — Master English Fluency in 5 Daily Activities",
  description:
    "Build real English fluency with 5 science-backed daily activities: Shadowing, Speaking, Reading, Writing, and Spaced Repetition Review.",
  keywords: [
    "English fluency",
    "language learning",
    "spaced repetition",
    "shadowing",
    "English practice",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={"antialiased min-h-screen"}
      >
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--background-card)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            },
          }}
        />
      </body>
    </html>
  );
}
