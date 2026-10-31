"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Phone, User, Lock, MapPin, Navigation, ArrowRight, Eye, EyeOff } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const { register } = useAuth();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [addressLine, setAddressLine] = useState("");
  const [locality, setLocality] = useState("Mulbagal Town");
  const [latitude, setLatitude] = useState(13.1645);
  const [longitude, setLongitude] = useState(78.3952);

  const [detecting, setDetecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation not supported on your device");
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);

        try {
          const res = await fetch("/api/location/geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng }),
          });
          if (res.ok) {
            const data = await res.json();
            setAddressLine(data.formattedAddress);
            if (data.locality) setLocality(data.locality);
          } else {
            setAddressLine(`Near (${lat.toFixed(4)}, ${lng.toFixed(4)}), Mulbagal`);
          }
        } catch {
          setAddressLine(`Main Road, Mulbagal`);
        } finally {
          setDetecting(false);
        }
      },
      () => {
        setDetecting(false);
        setErrorMsg("Unable to access GPS. Please type your street address.");
      }
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const regData = {
      name,
      mobile,
      email: email || undefined,
      password,
      address: addressLine
        ? {
            label: "Home",
            addressLine,
            locality,
            city: "Mulbagal",
            postalCode: "563131",
            latitude,
            longitude,
          }
        : undefined,
    };

    const res = await register(regData);
    setIsLoading(false);

    if (res.success) {
      router.push(redirectUrl);
    } else {
      setErrorMsg(res.error || "Registration failed");
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Logo size="lg" className="justify-center" />
        <h2 className="text-xl sm:text-2xl font-serif font-medium text-charcoal-700 pt-2">
          Create Your Account
        </h2>
        <p className="text-xs text-charcoal-500">
          Join Fresh Chicken for express Mulbagal deliveries and exclusive offers.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-cream-50 py-8 px-6 sm:px-10 rounded-3xl border border-cream-200 shadow-card space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Babu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-cream-100 border border-cream-300 rounded-xl text-xs text-charcoal-700 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-amberGold-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Mobile Number (Required)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-cream-100 border border-cream-300 rounded-xl text-xs text-charcoal-700 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-amberGold-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="ramesh@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-cream-100 border border-cream-300 rounded-xl text-xs text-charcoal-700 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-amberGold-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-cream-100 border border-cream-300 rounded-xl text-xs text-charcoal-700 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-amberGold-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600 focus:outline-none p-0.5 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Delivery Address Section with GPS Assisted Fill */}
            <div className="pt-2 border-t border-cream-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-charcoal-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amberGold-600" />
                  <span>Delivery Address in Mulbagal</span>
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={detecting}
                  className="text-[11px] font-semibold text-amberGold-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <Navigation className="w-3 h-3" />
                  <span>{detecting ? "Locating..." : "Auto-detect GPS"}</span>
                </button>
              </div>

              <textarea
                rows={2}
                placeholder="Street address, house number, landmark in Mulbagal"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-cream-100 border border-cream-300 rounded-xl text-charcoal-700 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-amberGold-400"
              />
            </div>

            {/* Privacy Policy Consent & Notice */}
            <p className="text-[11px] text-charcoal-500 text-center leading-relaxed px-1">
              By creating an account, you agree to our{" "}
              <Link href="/terms-and-conditions" className="text-amberGold-600 underline font-medium" target="_blank">
                Terms
              </Link>{" "}
              and acknowledge our{" "}
              <Link href="/privacy-policy" className="text-amberGold-600 underline font-medium" target="_blank">
                Privacy Policy
              </Link>.
            </p>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <div className="text-center pt-2 text-xs text-charcoal-500">
            Already registered?{" "}
            <Link
              href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
              className="font-semibold text-amberGold-600 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center text-xs text-charcoal-400 font-mono">
          Loading registration...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
