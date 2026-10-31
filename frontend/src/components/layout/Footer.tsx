"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { MapPin, Phone, Clock, ShieldCheck, Truck, Sparkles } from "lucide-react";

export const Footer: React.FC = () => {
  const pathname = usePathname();

  // Hide on admin or delivery sub-surfaces
  if (pathname.startsWith("/admin") || pathname.startsWith("/delivery")) {
    return null;
  }

  return (
    <footer className="bg-charcoal-600 text-cream-100 pt-16 pb-12 border-t border-charcoal-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Core Value Props Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-charcoal-400">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-charcoal-500 text-amberGold-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-semibold text-cream-50">
                100% Farm Fresh Daily
              </h4>
              <p className="text-xs text-charcoal-50 mt-1">
                Zero frozen storage. Freshly portioned and customized upon your order.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-charcoal-500 text-amberGold-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-semibold text-cream-50">
                Express Mulbagal Delivery
              </h4>
              <p className="text-xs text-charcoal-50 mt-1">
                First 3 km free. Target delivery in approximately 20 minutes across town.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-charcoal-500 text-amberGold-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-semibold text-cream-50 flex items-center gap-1.5">
                <span>100% Halal Custom Cuts</span>
              </h4>
              <p className="text-xs text-charcoal-50 mt-1">
                Hand-slaughtered strictly per Islamic dietary standards. Prepared in sanitised clean rooms.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-charcoal-500 text-amberGold-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-semibold text-cream-50">
                Open All 7 Days
              </h4>
              <p className="text-xs text-charcoal-50 mt-1">
                8:30 AM to 7:00 PM. Serving fresh morning &amp; evening deliveries daily.
              </p>
            </div>
          </div>
        </div>

        {/* Main Links & AEO Factual Quick Directory */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 py-12 border-b border-charcoal-400">
          {/* Brand Info */}
          <div className="space-y-4">
            <Logo variant="light" size="md" />
            <p className="text-xs text-charcoal-50 leading-relaxed">
              Mulbagal&apos;s trusted local source for farm-fresh halal chicken cuts and farm eggs. Prepared hygienically at our Srinivaspur Road express hub.
            </p>
            <div className="space-y-1.5 text-xs text-cream-200">
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amberGold-400 flex-shrink-0" />
                Srinivaspur Road, Mulbagal 563131
              </p>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amberGold-400 flex-shrink-0" />
                <a href="tel:+919035526638" className="hover:text-amberGold-300 transition-colors">
                  +91 90355 26638
                </a>
              </div>
              <p className="flex items-center gap-2">
                <span className="text-amberGold-400 text-xs">✉</span>
                <a href="mailto:support.homemart4u@gmail.com" className="hover:text-amberGold-300 transition-colors">
                  support.homemart4u@gmail.com
                </a>
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-sm font-semibold text-cream-50 mb-3 tracking-wide">
              Quick Navigation
            </h4>
            <ul className="space-y-2 text-xs text-charcoal-50">
              <li>
                <Link href="/menu" className="hover:text-cream-50 transition-colors">
                  Store Catalog &amp; Menu
                </Link>
              </li>
              <li>
                <Link href="/offers" className="hover:text-cream-50 transition-colors">
                  Today&apos;s Offers &amp; Discounts
                </Link>
              </li>
              <li>
                <Link href="/location" className="hover:text-cream-50 transition-colors">
                  Mulbagal Delivery Zones
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-cream-50 transition-colors">
                  About Our Srinivaspur Road Hub
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-cream-50 transition-colors">
                  Help &amp; Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care & Hours */}
          <div>
            <h4 className="font-serif text-sm font-semibold text-cream-50 mb-3 tracking-wide">
              Customer Support
            </h4>
            <ul className="space-y-2 text-xs text-charcoal-50">
              <li>
                <p className="text-cream-50 font-medium">Daily Operating Hours</p>
                <p className="text-cream-200/80">8:30 AM &ndash; 7:00 PM (All 7 Days)</p>
              </li>
              <li className="pt-1">
                <p className="text-cream-50 font-medium">Express Dispatch Hub</p>
                <p className="text-cream-200/80">Srinivaspur Road, Mulbagal &bull; 563131</p>
              </li>
              <li className="pt-1 flex flex-col gap-1">
                <a
                  href="tel:+919035526638"
                  className="inline-flex items-center gap-1.5 text-amberGold-400 hover:text-amberGold-300 font-medium"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>+91 90355 26638</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Statutory Rights */}
          <div>
            <h4 className="font-serif text-sm font-semibold text-cream-50 mb-3 tracking-wide">
              Legal &amp; Consumer Rights
            </h4>
            <ul className="space-y-2 text-xs text-charcoal-50">
              <li>
                <Link href="/privacy-policy" className="hover:text-cream-50 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-and-conditions" className="hover:text-cream-50 transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/cancellation-refund-policy" className="hover:text-cream-50 transition-colors">
                  Cancellation &amp; Refunds
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="hover:text-cream-50 transition-colors">
                  Shipping &amp; Delivery SLA
                </Link>
              </li>
              <li>
                <Link href="/grievance-redressal" className="hover:text-cream-50 transition-colors">
                  Grievance Redressal
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="hover:text-cream-50 transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-cream-50 transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Sub-surfaces */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-charcoal-50 gap-4">
          <p>
            &copy; 2026 homemart4u. All Rights Reserved. powered by{" "}
            <a
              href="https://r2dlabs.r2d-labs.workers.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amberGold-400 hover:text-amberGold-300 font-semibold underline underline-offset-2 transition-colors"
            >
              R2D Labs
            </a>
          </p>
          <div className="flex items-center gap-5 flex-wrap justify-center sm:justify-end">
            <Link href="/location" className="hover:text-cream-50 transition-colors">
              Delivery Coverage
            </Link>
            <Link href="/about" className="hover:text-cream-50 transition-colors">
              Freshness &amp; Halal Standard
            </Link>
            <Link href="/privacy-policy" className="hover:text-cream-50 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/contact" className="hover:text-cream-50 transition-colors">
              Support &amp; Inquiries
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
