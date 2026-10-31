import React from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";

export const metadata = {
  title: "Cookie Policy | homemart4u Mulbagal",
  description:
    "Cookie policy for homemart4u. Full disclosure of strictly essential authentication cookies, local storage preferences, and zero cross-site ad tracking.",
};

export default function CookiePolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
      {/* Header */}
      <div className="space-y-3 border-b border-cream-200 pb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream-100 border border-cream-300 text-charcoal-700 text-xs font-semibold">
          <Cookie className="w-3.5 h-3.5 text-amberGold-600" />
          <span>Transparent Storage Disclosure</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-700">
          Cookie &amp; Local Storage Policy
        </h1>
        <p className="text-xs text-charcoal-500 font-mono">
          Last Updated: October 2026 &bull; HomeMart4U
        </p>
      </div>

      <div className="prose prose-sm max-w-none text-charcoal-600 space-y-8 text-xs sm:text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-charcoal-800 flex items-center gap-2">
            <span className="text-amberGold-600">1.</span> What are Cookies &amp; Storage Technologies?
          </h2>
          <p>
            Cookies are small text files placed on your device by your web browser when you visit a website. Local storage allows a web application to store data locally within your browser without transmitting it across external networks.
          </p>
          <p>
            At <strong>homemart4u</strong>, we believe in radical transparency: we use only strictly necessary technologies to authenticate your sessions and remember your shopping cart items.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-charcoal-800 flex items-center gap-2">
            <span className="text-amberGold-600">2.</span> Technologies Actually Used on homemart4u
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-cream-300 rounded-xl overflow-hidden">
              <thead className="bg-cream-100 text-charcoal-800">
                <tr>
                  <th className="p-3 font-bold">Identifier</th>
                  <th className="p-3 font-bold">Type</th>
                  <th className="p-3 font-bold">Purpose</th>
                  <th className="p-3 font-bold">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                <tr className="bg-white">
                  <td className="p-3 font-mono font-bold text-charcoal-800">fc_token</td>
                  <td className="p-3">HTTP Cookie (HttpOnly, Secure, SameSite=Lax)</td>
                  <td className="p-3 text-charcoal-600">Essential session token used to keep you signed in securely.</td>
                  <td className="p-3">7 Days</td>
                </tr>
                <tr className="bg-cream-50">
                  <td className="p-3 font-mono font-bold text-charcoal-800">cart_items</td>
                  <td className="p-3">Browser LocalStorage</td>
                  <td className="p-3 text-charcoal-600">Maintains your selected chicken and egg items in the cart while you browse.</td>
                  <td className="p-3">Persistent until cleared</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 font-mono font-bold text-charcoal-800">user_coords</td>
                  <td className="p-3">Browser SessionStorage</td>
                  <td className="p-3 text-charcoal-600">Caches your GPS coordinates temporarily to calculate accurate delivery fees without repeatedly requesting permission.</td>
                  <td className="p-3">Session end (tab close)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-charcoal-800 flex items-center gap-2">
            <span className="text-amberGold-600">3.</span> Zero Invasive Tracking or Advertising Ad-Networks
          </h2>
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>No Cross-Site Ad Trackers or Third-Party Ad Pixels</span>
            </div>
            <p className="text-emerald-800 leading-relaxed">
              We <strong>do not</strong> load third-party behavioral advertising scripts, Facebook/Meta tracking pixels, Google remarketing cookies, or data-broker trackers. We never sell your viewing habits or order history to commercial data brokers.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-charcoal-800 flex items-center gap-2">
            <span className="text-amberGold-600">4.</span> How to Manage or Disable Cookies
          </h2>
          <p>
            You can configure your browser (Chrome, Safari, Firefox, Edge) to block or delete cookies at any time. Please note that blocking the strictly essential <code>fc_token</code> cookie will prevent you from logging into your account or placing orders.
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-cream-200 flex flex-wrap gap-4 text-xs text-charcoal-500 justify-between items-center">
        <span>Questions? Read our <Link href="/privacy-policy" className="text-amberGold-600 underline font-medium">Privacy Policy</Link></span>
        <div className="flex gap-4">
          <Link href="/terms-and-conditions" className="hover:text-charcoal-800 underline">Terms &amp; Conditions</Link>
          <Link href="/contact" className="hover:text-charcoal-800 underline">Contact Support</Link>
        </div>
      </div>
    </div>
  );
}
