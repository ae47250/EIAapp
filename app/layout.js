import "./globals.css";

export const metadata = {
  title: "EIA++ AI Assisted Data Extraction Tool",
  description: "AI-assisted search and export for EIA international energy data."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
