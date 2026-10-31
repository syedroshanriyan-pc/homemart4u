import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Eye, Trash2, UserCheck, AlertCircle, FileText } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | DPDP Act Compliance | homemart4u Mulbagal",
  description:
    "Privacy Policy for homemart4u compliant with India's Digital Personal Data Protection Act, 2023 (DPDP Act) and IT Rules. Learn how your data is collected, processed, and safeguarded.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "October 2026";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
      {/* Header Banner */}
      <div className="space-y-3 border-b border-cream-200 pb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Compliant with DPDP Act, 2023 &amp; DPDP Rules, 2025</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-700">
          Privacy Policy
        </h1>
        <p className="text-xs text-charcoal-500 font-mono">
          Effective Date: {lastUpdated} &bull; HomeMart4U (Srinivaspur Road Hub, Mulbagal 563131, Karnataka)
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="prose prose-sm max-w-none text-charcoal-600 space-y-8 text-xs sm:text-sm leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-charcoal-800 flex items-center gap-2">
            <span className="text-amberGold-600">1.</span> Introduction &amp; Legal Identity
          </h2>
          <p>
            HomeMart4U (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the e-commerce storefront for fresh chicken cuts and farm eggs serving Mulbagal, Karnataka. We are committed to safeguarding your privacy in strict adherence to the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>, the <strong>DPDP Rules, 2025</strong>, and the <strong>Information Technology Act, 2000</strong>.
          </p>
          <p>
            This Privacy Policy explains what personal data (as a &ldquo;Data Principal&rdquo;) you provide to us, how we process it, the legal basis of processing, retention timelines, and your statutory rights to access, rectify, and erase your personal data.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-charcoal-800 flex items-center gap-2">
            <span className="text-amberGold-600">2.</span> Categories of Personal Data Collected
          </h2>
          <p>
            We collect only the minimum personal data strictly necessary to fulfill your fresh chicken and egg orders:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-cream-50 border border-cream-200">
              <strong className="text-charcoal-800 block mb-1">Contact &amp; Account Identifiers</strong>
              <p className="text-xs text-charcoal-500">
                Full name, 10-digit Indian mobile number, and email address (optional) used for order confirmation, dispatch updates, and account authentication.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-cream-50 border border-cream-200">
              <strong className="text-charcoal-800 block mb-1">Delivery Geolocation &amp; Address</strong>
              <p className="text-xs text-charcoal-500">
                Street address, house/flat number, landmarks in Mulbagal, and GPS latitude/longitude coordinates required for distance-based delivery calculations and rider routing.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-cream-50 border border-cream-200">
              <strong className="text-charcoal-800 block mb-1">Transaction &amp; Order History</strong>
              <p className="text-xs text-charcoal-500">
                Items ordered, cutting preferences (curry cut, biryani cut, etc.), order timestamps, payment methods (COD or UPI), and digital invoice snapshots.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-cream-50 border border-cream-200">
              <strong className="text-charcoal-800 block mb-1">Payment Information Safeguards</strong>
              <p className="text-xs text-charcoal-500">
                We <strong>do not store</strong> bank account passwords, UPI PINs, or debit/credit card CVVs. UPI transactions occur directly via NPCI/authorized apps (GPay, PhonePe, Paytm).
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-charcoal-800 flex items-center gap-2">
            <span className="text-amberGold-600">3.</span> Legal Basis and Purposes of Processing
          </h2>
          <p>Under the DPDP Act 2023, we process personal data under two legitimate bases:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-charcoal-600">
            <li>
              <strong>Consent:</strong> Given affirmatively when registering or submitting an order to receive order tracking updates via SMS or WhatsApp.
            </li>
            <li>
              <strong>Certain Legitimate Uses (Section 7):</strong> Fulfilling consumer contracts (preparing food cuts, dispatching riders), complying with tax/GST accounting standards, and responding to food safety queries.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-charcoal-800 flex items-center gap-2">
            <span className="text-amberGold-600">4.</span> Disclosure to Third-Party Service Providers
          </h2>
          <p>
            We do not sell, rent, or trade your personal data. Data is shared exclusively with trusted technical partners under confidentiality contracts:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-charcoal-600">
            <li><strong>Delivery Partners:</strong> Assigned riders receive only your name, phone number, and delivery address to complete your order drop-off.</li>
            <li><strong>Transactional Notification Providers:</strong> SMS/WhatsApp gateways solely for sending automated OTPs and delivery status notifications.</li>
            <li><strong>Cloud &amp; Database Infrastructure:</strong> Secure managed database servers in India/compliant cloud zones operating under TLS encryption.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-charcoal-800 flex items-center gap-2">
            <span className="text-amberGold-600">5.</span> Your Rights as a Data Principal
          </h2>
          <p>Under Chapter III of the DPDP Act, 2023, you hold the following enforceable rights:</p>
          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-cream-50 border border-cream-200">
              <Eye className="w-4 h-4 text-amberGold-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-charcoal-800 block text-xs">Right to Access &amp; Summary:</strong>
                <span className="text-[11px] text-charcoal-500">You may inspect your active profile, saved addresses, and historical invoices directly in your account.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-cream-50 border border-cream-200">
              <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-charcoal-800 block text-xs">Right to Correction &amp; Updation:</strong>
                <span className="text-[11px] text-charcoal-500">You may update your profile details and saved delivery addresses at any time.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-cream-50 border border-cream-200">
              <Trash2 className="w-4 h-4 text-crimson-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-charcoal-800 block text-xs">Right to Erasure (&ldquo;Delete Account&rdquo;):</strong>
                <span className="text-[11px] text-charcoal-500">
                  You can permanently delete your account and personal data with one click from <Link href="/account" className="text-amberGold-600 underline font-medium">My Account</Link>. All addresses, profile data, and sessions are permanently scrubbed.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-charcoal-800 flex items-center gap-2">
            <span className="text-amberGold-600">6.</span> Data Retention &amp; Security Controls
          </h2>
          <p>
            We implement comprehensive technical and organizational safeguards:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-charcoal-600">
            <li>HTTPS with HSTS (HTTP Strict Transport Security) encryption in transit across all pages and API endpoints.</li>
            <li>Bcrypt password hashing with high salt work factors; passwords are never stored in plaintext.</li>
            <li>Strict server-side role-based access control (RBAC) preventing unauthorized cross-customer data exposure.</li>
            <li>Data is retained only as long as an active account exists or as required by applicable tax retention laws.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-charcoal-800 flex items-center gap-2">
            <span className="text-amberGold-600">7.</span> Grievance Officer &amp; Redressal Mechanism
          </h2>
          <p>
            In compliance with Rule 4(4) of the Consumer Protection (E-Commerce) Rules, 2020 and DPDP Act provisions, our appointed Grievance Officer details are:
          </p>
          <div className="p-4 rounded-2xl bg-cream-100 border border-cream-300 text-xs space-y-1.5 text-charcoal-700">
            <p><strong>Designation:</strong> Grievance Redressal Officer</p>
            <p><strong>Entity:</strong> homemart4u (Srinivaspur Road Hub)</p>
            <p><strong>Address:</strong> Srinivaspur Road, Mulbagal, Karnataka &ndash; 563131</p>
            <p><strong>Email:</strong> <a href="mailto:support.homemart4u@gmail.com" className="text-amberGold-600 underline">support.homemart4u@gmail.com</a></p>
            <p><strong>Helpline:</strong> +91 90355 26638</p>
            <p className="text-[11px] text-charcoal-500 pt-1">
              Acknowledgment SLA: Within 48 hours &bull; Resolution SLA: Within 30 days of receipt.
            </p>
          </div>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="pt-6 border-t border-cream-200 flex flex-wrap gap-4 text-xs text-charcoal-500 justify-between items-center">
        <span>Need further details? Visit our <Link href="/contact" className="text-amberGold-600 underline">Support Desk</Link></span>
        <div className="flex gap-4">
          <Link href="/terms-and-conditions" className="hover:text-charcoal-800 underline">Terms &amp; Conditions</Link>
          <Link href="/cookie-policy" className="hover:text-charcoal-800 underline">Cookie Policy</Link>
          <Link href="/grievance-redressal" className="hover:text-charcoal-800 underline">Grievance Redressal</Link>
        </div>
      </div>
    </div>
  );
}
