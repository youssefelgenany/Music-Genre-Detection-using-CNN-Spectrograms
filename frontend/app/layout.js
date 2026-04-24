import { Inter, Manrope } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Gen Scope - Sonic Curator",
  description: "Music genre detection with spectral CNN",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`dark ${manrope.variable} ${inter.variable} h-full`}
    >
      <body className="bg-background text-on-background font-body min-h-screen min-h-[100dvh] w-full flex flex-col overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
