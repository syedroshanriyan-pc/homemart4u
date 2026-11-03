import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { InstallPromptBanner } from "@/components/pwa/InstallPromptBanner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "homemart4u — Fresh Chicken & Farm Eggs | Srinivaspur Road, Mulbagal",
  description:
    "Order farm-fresh chicken and quality eggs online from homemart4u in Mulbagal. Daily fresh cuts prepared to order, doorstep delivery from Srinivaspur Road, and Cash on Delivery (COD) available.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "homemart4u",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  keywords: [
    "homemart4u",
    "homemart4u Mulbagal",
    "Fresh Chicken Mulbagal",
    "Farm Eggs Mulbagal",
    "Srinivaspur Road Mulbagal",
    "Fresh Meat Mulbagal",
    "Buy Chicken Online Mulbagal",
    "Chicken Cuts Mulbagal",
    "Desi Eggs Mulbagal",
  ],
  metadataBase: (() => {
    const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "https://homemart4u.in";
    try {
      const trimmed = raw.trim();
      const withScheme = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
      return new URL(withScheme);
    } catch {
      return new URL("https://homemart4u.in");
    }
  })(),
  openGraph: {
    title: "homemart4u | Fresh Chicken & Eggs Mulbagal",
    description: "Farm-fresh chicken and quality eggs delivered to your doorstep in Mulbagal from Srinivaspur Road.",
    type: "website",
    locale: "en_IN",
    siteName: "homemart4u",
    url: "https://homemart4u.in",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "homemart4u",
    url: "https://homemart4u.in",
    description:
      "Daily fresh chicken, customizable cuts, and farm eggs with local doorstep delivery in Mulbagal.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Srinivaspur Road",
      addressLocality: "Mulbagal",
      addressRegion: "Karnataka",
      postalCode: "563131",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 13.1645,
      longitude: 78.3952,
    },
    telephone: "+919035526638",
    priceRange: "₹₹",
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col bg-cream-50 text-charcoal-600 antialiased`}>
        <AuthProvider>
          <CartProvider>
            <PwaRegister />
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <InstallPromptBanner />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
