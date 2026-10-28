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
  title: "homemart4u - Daily Groceries & Fresh Meat | Srinivaspur Road, Mulbagal",
  description:
    "Order 100% farm fresh chicken & daily groceries online from homemart4u in Mulbagal. Free delivery for first 3km, ~20-minute delivery from Srinivaspur Road, custom curry/biryani cuts, dynamic UPI QR payments, and COD available.",
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
    "Groceries Mulbagal",
    "Srinivaspur Road Mulbagal",
    "Fresh Meat Mulbagal",
    "Buy Chicken Online Mulbagal",
    "Farm Fresh Chicken Karnataka",
    "Curry Cut Chicken Mulbagal",
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
    title: "homemart4u | Groceries & Fresh Meat Mulbagal",
    description: "Premium fresh chicken and daily groceries delivered to your doorstep in Mulbagal from Srinivaspur Road in ~20 minutes.",
    type: "website",
    locale: "en_IN",
    siteName: "homemart4u",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "GroceryStore",
    name: "homemart4u",
    description:
      "Daily fresh tender chicken, customizable halal cuts, farm eggs, and essential groceries with express delivery in Mulbagal.",
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
    openingHours: "Mo-Su 08:30-19:00",
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
