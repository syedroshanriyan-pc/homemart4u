"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { MapPin, Phone, Mail, Clock, Send, Check } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setName("");
      setMobile("");
      setMessage("");
      setSubmitted(false);
    }, 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs uppercase font-semibold text-amberGold-600 tracking-wider">
          Store & Support
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-700">
          Get in Touch with homemart4u
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-500">
          Have a question about fresh chicken cuts, farm eggs, or express delivery service in Mulbagal? We&apos;re here to assist.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Info Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-cream-50 p-6 rounded-2xl border border-cream-200 shadow-subtle space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-cream-100 text-amberGold-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-semibold text-charcoal-700">
                  Storefront Address
                </h3>
                <p className="text-xs text-charcoal-500 mt-0.5 leading-relaxed">
                  Srinivaspur Road, Mulbagal 563131
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-cream-100 text-amberGold-600">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-semibold text-charcoal-700">
                  Phone / WhatsApp
                </h3>
                <p className="text-xs text-charcoal-600 mt-0.5 font-medium">
                  <a href="tel:+919035526638" className="hover:text-amberGold-600 transition">
                    +91 90355 26638
                  </a>
                </p>
                <p className="text-[11px] text-charcoal-400 mt-0.5">Lines open 8:30 AM – 7:00 PM</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-cream-100 text-amberGold-600">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-semibold text-charcoal-700">
                  Customer Email Support
                </h3>
                <p className="text-xs text-charcoal-600 mt-0.5 font-medium">
                  <a href="mailto:support.homemart4u@gmail.com" className="hover:text-amberGold-600 transition">
                    support.homemart4u@gmail.com
                  </a>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-cream-100 text-amberGold-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-semibold text-charcoal-700">
                  Business Hours
                </h3>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Monday &ndash; Sunday: 8:30 AM &ndash; 7:00 PM
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Open All 7 Days
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="lg:col-span-7 bg-cream-50 p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-card">
          <h2 className="font-serif text-lg font-semibold text-charcoal-700 mb-1">
            Send Us a Message
          </h2>
          <p className="text-xs text-charcoal-500 mb-6">
            For catering inquiries or feedback, leave your note below.
          </p>

          {submitted && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Thank you! Your message has been sent to our customer care team at Srinivaspur Road.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-cream-100 border border-cream-300 rounded-xl text-xs text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-amberGold-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-cream-100 border border-cream-300 rounded-xl text-xs text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-amberGold-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Your Inquiry / Message
              </label>
              <textarea
                required
                rows={4}
                placeholder="Tell us what you need or ask about delivery locations in Mulbagal..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cream-100 border border-cream-300 rounded-xl text-xs text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-amberGold-400"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
            >
              {submitted ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-emerald-400" />
                  <span>Message Sent Successfully</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1.5" />
                  <span>Submit Inquiry</span>
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
