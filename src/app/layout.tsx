import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MetroMovies | Asian Dramas, Anime & Movies — by dbarya",
  description:
    "Watch high quality Asian dramas, K-Drama, C-Drama, Anime, and movies online in HD with multi-language subtitles. Feel Free To Watch on MetroMovies by dbarya.",
  keywords: [
    "MetroMovies",
    "Watch high quality drama online",
    "korean drama",
    "kdrama",
    "japanese drama",
    "chinese drama",
    "cdrama",
    "anime online",
    "english subtitle",
    "watch series online",
    "dbarya",
  ],
  authors: [{ name: "dbarya" }],
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full dark`}
    >
      <body className="min-h-full flex flex-col bg-[#141414] text-[#f3f4f6] selection:bg-[#e50914] selection:text-white">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
