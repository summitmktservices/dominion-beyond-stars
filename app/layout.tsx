import "./globals.css";

export const metadata = {
  title: "Dominion: Beyond the Stars",
  description: "A mobile-first grand strategy galaxy simulator."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}