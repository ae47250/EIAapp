import "./globals.css";

export const metadata = {
  title: "Version 3.0: EIA AI Assisted Data Finder",
  description: "AI-assisted search and export for EIA international energy data."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
