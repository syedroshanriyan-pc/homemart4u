"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { LocationModal } from "@/components/ui/LocationModal";
import {
  MapPin,
  ChevronDown,
  Shield,
  Bike,
  Phone,
  X,
  ShoppingBag,
  Heart,
  LogOut,
  User,
  ArrowRight,
  Star,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, loading, selectedAddress, logout } = useAuth();
  const { itemCount } = useCart();
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lock body scroll when side drawer is open
  React.useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  // If we are in admin or delivery sub-surface, render their dedicated layouts
  if (pathname.startsWith("/admin") || pathname.startsWith("/delivery")) {
    return null;
  }

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Store Catalog", href: "/menu" },
    { label: "Offers", href: "/offers" },
    { label: "Location", href: "/location" },
    { label: "About & Story", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <>
      {/* Top Banner: Service Area & Delivery Promise */}
      <div className="bg-stone-900 text-stone-200 text-xs py-1.5 px-4 text-center font-sans tracking-wide border-b border-stone-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[11px] sm:text-xs">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-rose-300 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Srinivaspur Road Hub &bull; Express ~20 Min Delivery
          </span>
          <span className="mx-auto sm:mx-0 flex items-center gap-1.5">
            <strong>homemart4u</strong> &bull; Fresh Groceries &amp; 100% Halal Meats &bull; First 3 km FREE
          </span>
          <div className="hidden md:flex items-center gap-2 text-stone-300">
            <span>Call:</span>
            <a href="tel:+919035526638" className="hover:text-rose-300 transition-colors font-medium">
              +91 90355 26638
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-2 sm:gap-4">
            {/* Left Section: 1. 3-bar Menu Toggle, 2. Brand Logo */}
            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
              {/* 1. 3-bar Menu Trigger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Open Navigation Menu"
                className="p-2 -ml-1 rounded-full text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center justify-center"
              >
                <svg
                  className="w-6 h-6 text-stone-700"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {isMobileMenuOpen ? (
                    <>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </>
                  ) : (
                    <>
                      <line x1="4" y1="6" x2="20" y2="6" />
                      <line x1="4" y1="12" x2="20" y2="12" />
                      <line x1="4" y1="18" x2="20" y2="18" />
                    </>
                  )}
                </svg>
              </button>

              {/* 2. Logo (between 3-bar and cart) */}
              <div className="flex-shrink-0">
                <Logo size="sm" className="sm:hidden" />
                <Logo size="md" className="hidden sm:inline-flex" />
              </div>
            </div>

            {/* Location Selector Pill */}
            <button
              onClick={() => setIsLocationOpen(true)}
              className="hidden md:flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-left transition-all max-w-[280px]"
            >
              <MapPin className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
                  Srinivaspur Road, Mulbagal
                </p>
                <p className="text-xs font-semibold text-stone-800 truncate">
                  {selectedAddress
                    ? `${selectedAddress.locality || selectedAddress.addressLine}`
                    : "Srinivaspur Road Hub (Tap to set pin)"}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-7">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium tracking-wide transition-colors ${
                      isActive
                        ? "text-amberGold-600 font-semibold"
                        : "text-charcoal-500 hover:text-charcoal-700"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right CTAs: 3. Cart, then 4. Profile */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* 3. Cart Button with Direct SVG Logo & Notification Badge */}
              <Link
                href="/cart"
                aria-label="Shopping Cart"
                className="relative p-2 rounded-full text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1.5 group"
                title="View Shopping Cart"
              >
                <div className="relative flex items-center justify-center">
                  {/* Direct Shopping Cart SVG Logo */}
                  <svg
                    className="w-6 h-6 text-stone-700 group-hover:text-rose-600 transition-colors"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="8" cy="21" r="1.5" />
                    <circle cx="19" cy="21" r="1.5" />
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                  </svg>

                  {/* Real-time Cart Item Counter Badge */}
                  {itemCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[19px] h-[19px] px-1 text-[10px] font-black bg-rose-600 text-white rounded-full flex items-center justify-center shadow-xs ring-2 ring-white animate-in zoom-in-75">
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  )}
                </div>
                <span className="hidden md:inline text-xs font-semibold text-stone-700 group-hover:text-rose-600">
                  Cart
                </span>
              </Link>

              {/* 4. Account / Profile Button */}
              {loading ? (
                <div className="p-2 flex items-center gap-1.5 animate-pulse">
                  <div className="w-6 h-6 rounded-full bg-stone-200" />
                  <span className="hidden md:inline-block w-12 h-3 bg-stone-200 rounded" />
                </div>
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    aria-label="My Account"
                    className="relative p-2 rounded-full text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1.5 group"
                    title={`Signed in as ${user.name}`}
                  >
                    {/* Direct Profile SVG Logo */}
                    <div className="relative flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-stone-700 group-hover:text-stone-900 transition-colors"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      {/* Active status indicator dot */}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                    </div>
                    <span className="hidden md:inline text-xs font-semibold text-stone-700 group-hover:text-stone-900 max-w-[85px] truncate">
                      {user.name.split(" ")[0]}
                    </span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-card border border-stone-200 py-2 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-4 py-2 border-b border-stone-100">
                        <p className="text-xs font-bold text-stone-800 truncate">{user.name}</p>
                        <p className="text-[11px] text-stone-500 font-mono">{user.mobile}</p>
                      </div>

                      <Link
                        href="/account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 text-xs text-stone-700 hover:bg-rose-50/50 hover:text-rose-700 transition-colors"
                      >
                        My Account &amp; Profile
                      </Link>
                      <Link
                        href="/account/orders"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 text-xs text-stone-700 hover:bg-rose-50/50 hover:text-rose-700 transition-colors"
                      >
                        Order History
                      </Link>
                      <Link
                        href="/account/addresses"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 text-xs text-stone-700 hover:bg-rose-50/50 hover:text-rose-700 transition-colors"
                      >
                        Saved Addresses
                      </Link>
                      <Link
                        href="/account/favorites"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 text-xs text-stone-700 hover:bg-rose-50/50 hover:text-rose-700 transition-colors"
                      >
                        My Favorites
                      </Link>

                      {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                        <Link
                          href="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-4 py-2 text-xs font-bold text-amberGold-700 bg-amberGold-50 hover:bg-amberGold-100 border-t border-stone-100 transition-colors"
                        >
                          ⚙️ Admin Dashboard
                        </Link>
                      )}

                      {user.role === "DELIVERY_AGENT" && (
                        <Link
                          href="/delivery"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-t border-stone-100 transition-colors"
                        >
                          🛵 Delivery Portal
                        </Link>
                      )}

                      <div className="border-t border-stone-100 pt-1 mt-1">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  aria-label="Sign In"
                  className="p-2 rounded-full text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1.5 group"
                  title="Login to your account"
                >
                  {/* Direct Profile SVG Logo */}
                  <svg
                    className="w-6 h-6 text-stone-700 group-hover:text-stone-900 transition-colors"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="hidden md:inline text-xs font-semibold text-stone-700 group-hover:text-stone-900">
                    Login
                  </span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Location Bar */}
          <div className="py-2.5 border-t border-cream-200 flex items-center justify-between md:hidden">
            <button
              onClick={() => setIsLocationOpen(true)}
              className="flex items-center gap-2 text-left"
            >
              <MapPin className="w-4 h-4 text-amberGold-600 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-semibold text-charcoal-400 block">
                  Delivery Area
                </span>
                <span className="text-xs font-medium text-charcoal-700 truncate block">
                  {selectedAddress
                    ? `${selectedAddress.locality || selectedAddress.addressLine}, Mulbagal`
                    : "Tap to select location in Mulbagal"}
                </span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Side Drawer & Backdrop Overlay (Half Screen Horizontal on Mobile & Desktop) */}
      {/* 1. Backdrop */}
      <div
        className={`fixed inset-0 bg-charcoal-900/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* 2. Half-Screen Slide-over Drawer */}
      <aside
        aria-label="Side Navigation Menu"
        className={`fixed top-0 left-0 bottom-0 h-full h-[100dvh] max-h-[100dvh] w-[76vw] sm:w-[50vw] md:w-[420px] max-w-md z-50 bg-cream-50 shadow-2xl flex flex-col border-r border-cream-200 transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-cream-200 bg-white flex-shrink-0">
          <Logo size="sm" />
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close Navigation Menu"
            className="p-1.5 rounded-xl text-charcoal-500 hover:text-charcoal-800 hover:bg-cream-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content with Safe Mobile Bottom Padding */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-4 pb-36">
          {/* Delivery Location Widget in Drawer */}
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsLocationOpen(true);
            }}
            className="w-full p-2.5 rounded-2xl bg-white border border-cream-200 hover:border-amberGold-400 shadow-subtle flex items-center gap-2.5 text-left transition group"
          >
            <div className="p-2 rounded-xl bg-crimson-50 text-crimson-600 group-hover:bg-crimson-100 transition flex-shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] uppercase font-bold tracking-wider text-charcoal-400 block">
                Delivery Location
              </span>
              <span className="text-xs font-semibold text-charcoal-700 line-clamp-2 block leading-snug">
                {selectedAddress
                  ? `${selectedAddress.locality || selectedAddress.addressLine}, Mulbagal`
                  : "Tap to set Mulbagal address"}
              </span>
            </div>
          </button>

          {/* Quick Cart Shortcut in Drawer */}
          <Link
            href="/cart"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 font-bold text-xs hover:bg-amber-500/20 transition"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-600" />
              <span>Shopping Cart</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-mono">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </Link>

          {/* Comprehensive Store Navigation (All options fully visible from beginning to end) */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 px-2 block">
              Store Catalog &amp; Pages
            </span>
            <div className="space-y-1 pt-1">
              {[
                { label: "Home", href: "/", icon: "🏠" },
                { label: "Fresh Chicken", href: "/menu?cat=fresh-chicken", icon: "🍗" },
                { label: "Desi & Farm Eggs", href: "/menu?cat=eggs", icon: "🥚" },
                { label: "All Fresh Cuts", href: "/menu", icon: "🥩" },
                { label: "Offers & Deals", href: "/offers", icon: "🏷️" },
                { label: "Delivery Hub & Hours", href: "/location", icon: "📍" },
                { label: "100% Halal Guarantee", href: "/about", icon: "🛡️" },
                { label: "Customer Support", href: "/contact", icon: "📞" },
              ].map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? "bg-amberGold-100 text-amberGold-900 font-bold border border-amberGold-300"
                        : "text-charcoal-700 hover:bg-cream-100 hover:text-charcoal-900"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                      <span className="text-sm flex-shrink-0">{link.icon}</span>
                      <span className="leading-snug text-left break-words">{link.label}</span>
                    </span>
                    <ArrowRight
                      className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
                        isActive ? "text-amberGold-700" : "text-charcoal-400"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Account & Portal Options */}
          <div className="pt-3 border-t border-cream-200 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 px-2 block">
              User Profile &amp; Portals
            </span>
            {user ? (
              <div className="bg-white rounded-2xl p-3 border border-cream-200 shadow-subtle space-y-2.5">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-cream-200">
                  <div className="w-8 h-8 rounded-xl bg-charcoal-700 text-cream-50 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-charcoal-800 text-xs truncate">
                        {user.name}
                      </p>
                      {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amberGold-100 text-amberGold-800 border border-amberGold-300">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-charcoal-400 font-mono">
                      {user.mobile}
                    </p>
                  </div>
                </div>

                <div className="space-y-0.5">
                  {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 text-xs font-bold text-amberGold-900 bg-amberGold-100 hover:bg-amberGold-200 border border-amberGold-300 rounded-xl transition my-1"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amberGold-700 flex-shrink-0" />
                        <span>Admin Operations Portal</span>
                      </div>
                      <span className="text-[10px] text-amberGold-800 font-mono">&rarr;</span>
                    </Link>
                  )}

                  <Link
                    href="/account"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-charcoal-700 hover:bg-cream-50 rounded-xl transition"
                  >
                    <User className="w-3.5 h-3.5 text-charcoal-400 flex-shrink-0" />
                    <span>My Profile &amp; Account</span>
                  </Link>
                  <Link
                    href="/account/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-charcoal-700 hover:bg-cream-50 rounded-xl transition"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-charcoal-400 flex-shrink-0" />
                    <span>Order History &amp; Invoices</span>
                  </Link>
                  <Link
                    href="/account/addresses"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-charcoal-700 hover:bg-cream-50 rounded-xl transition"
                  >
                    <MapPin className="w-3.5 h-3.5 text-charcoal-400 flex-shrink-0" />
                    <span>Saved Delivery Addresses</span>
                  </Link>
                  <Link
                    href="/account/favorites"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-charcoal-700 hover:bg-cream-50 rounded-xl transition"
                  >
                    <Heart className="w-3.5 h-3.5 text-charcoal-400 flex-shrink-0" />
                    <span>Favorite Products</span>
                  </Link>
                  <Link
                    href="/account/reviews"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-charcoal-700 hover:bg-cream-50 rounded-xl transition"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span>My Ratings &amp; Reviews</span>
                  </Link>

                  {user.role === "DELIVERY_AGENT" && (
                    <Link
                      href="/delivery"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-forest-700 bg-forest-50 hover:bg-forest-100 rounded-xl transition"
                    >
                      <Bike className="w-3.5 h-3.5 text-forest-600 flex-shrink-0" />
                      <span>Delivery Partner Portal</span>
                    </Link>
                  )}
                </div>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs text-white bg-crimson-600 hover:bg-crimson-700 font-bold rounded-xl transition shadow-xs mt-2"
                >
                  <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-3 border border-cream-200 shadow-subtle space-y-2">
                <p className="text-[11px] text-charcoal-600 leading-snug">
                  Sign in to track orders, save multiple Mulbagal delivery addresses, and reorder.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center py-2 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition text-center"
                  >
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center py-2 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold border border-stone-300 transition text-center"
                  >
                    <span>Register</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Store Support & Operations Info */}
          <div className="pt-3 border-t border-cream-200 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 px-2 block">
              Store Support
            </span>
            <div className="p-3 bg-white rounded-2xl border border-cream-200 text-xs text-charcoal-600 space-y-1.5">
              <p className="font-semibold text-charcoal-800 text-xs">
                Srinivaspur Road Hub, Mulbagal
              </p>
              <p className="text-[10px] text-charcoal-500">
                Open Daily &bull; 8:30 AM – 7:00 PM
              </p>
              <div className="pt-1.5 flex flex-col gap-1 border-t border-cream-200 text-[11px]">
                <a
                  href="tel:+919035526638"
                  className="text-forest-700 hover:underline flex items-center gap-1.5 font-semibold"
                >
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span>+91 90355 26638</span>
                </a>
              </div>
            </div>

            {/* Powered by R2D Labs attribution */}
            <div className="pt-2 text-center text-[10px] text-charcoal-400">
              &copy; 2026 homemart4u. All Rights Reserved. powered by{" "}
              <a
                href="https://r2dlabs.r2d-labs.workers.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#EFA927] hover:text-amber-500 font-extrabold underline underline-offset-2 transition-colors"
              >
                R2D Labs
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* Location Modal */}
      <LocationModal
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
      />
    </>
  );
};
