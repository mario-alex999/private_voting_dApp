import type { Metadata } from "next";
import "./globals.css";
import { StarknetProvider } from "~/StarknetProvider";
import Footer from "./components/internal/Footer";
import { Analytics } from "./components/internal/Analytics";
import PwaBootstrap from "./components/internal/PwaBootstrap";

export const metadata: Metadata = {
  title: "VoteVault",
  applicationName: "VoteVault",
  description:
    "Private voting and DAO governance on Starknet with zero-knowledge proofs.",
  manifest: "/manifest.json",
  themeColor: "#05070a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VoteVault",
  },
  icons: {
    icon: [{ url: "/icons/votevault-glowing-v-192.svg", type: "image/svg+xml" }],
    apple: "/icons/votevault-glowing-v-192.svg",
    shortcut: "/icons/votevault-glowing-v-192.svg",
  },
  openGraph: {
    title: "VoteVault",
    description: "Private voting and DAO governance on Starknet with zero-knowledge proofs.",
    url: "https://votevault-pvs.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "VoteVault",
    description: "Private voting and DAO governance on Starknet with zero-knowledge proofs.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-coolvetica text-sm text-text-primary md:text-md">
        <StarknetProvider>{children}</StarknetProvider>
        <PwaBootstrap />
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
