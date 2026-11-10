const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function generateOgImages() {
  console.log("Generating WhatsApp & Social Open Graph images...");

  const svgBanner = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7F1D1D" />
      <stop offset="40%" stop-color="#991B1B" />
      <stop offset="100%" stop-color="#450A0A" />
    </linearGradient>

    <!-- Warm Glow Gradient -->
    <radialGradient id="glow" cx="20%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#DC2626" stop-opacity="0.8" />
      <stop offset="60%" stop-color="#991B1B" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#450A0A" stop-opacity="0" />
    </radialGradient>

    <!-- Card Background Gradient -->
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.14" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.04" />
    </linearGradient>

    <!-- Gold Accent Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="50%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />
  <rect width="1200" height="630" fill="url(#glow)" />

  <!-- Subtle grid dots pattern for tech-modern touch -->
  <circle cx="100" cy="80" r="2" fill="#FFFFFF" opacity="0.15" />
  <circle cx="300" cy="120" r="2" fill="#FFFFFF" opacity="0.1" />
  <circle cx="600" cy="70" r="3" fill="#FFFFFF" opacity="0.1" />
  <circle cx="950" cy="140" r="2" fill="#FFFFFF" opacity="0.15" />
  <circle cx="1100" cy="90" r="2" fill="#FFFFFF" opacity="0.1" />

  <!-- Decorative Border -->
  <rect x="24" y="24" width="1152" height="582" rx="20" fill="none" stroke="#F59E0B" stroke-width="2" stroke-opacity="0.4" />

  <!-- Content Container (Glassmorphism Pill) -->
  <rect x="56" y="56" width="1088" height="518" rx="24" fill="url(#cardGrad)" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="1.5" />

  <!-- Top Badge: Location & Quality -->
  <g transform="translate(96, 96)">
    <rect x="0" y="0" width="360" height="38" rx="19" fill="#15803D" stroke="#22C55E" stroke-width="1.5" />
    <text x="22" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="13" letter-spacing="1.5" fill="#FFFFFF">100% HALAL FRESH CUTS • MULBAGAL</text>
  </g>

  <!-- Fast Delivery Chip -->
  <g transform="translate(470, 96)">
    <rect x="0" y="0" width="220" height="38" rx="19" fill="#F59E0B" />
    <text x="20" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="13" letter-spacing="1.2" fill="#78350F">⚡ ~20-MIN DELIVERY</text>
  </g>

  <!-- Brand Title: HOMEMART4U -->
  <g transform="translate(96, 210)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="74" letter-spacing="-1.5">
      <tspan fill="#FFFFFF">HOME</tspan>
      <tspan fill="#FEF08A">MART</tspan>
      <tspan fill="#F59E0B">4U</tspan>
    </text>
    <!-- Tagline underneath title -->
    <text x="4" y="38" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="700" font-size="20" letter-spacing="3" fill="#FCA5A5">DAILY FRESH CHICKEN &amp; FARM EGGS</text>
  </g>

  <!-- Big Catchy Headline -->
  <g transform="translate(96, 310)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="34" fill="#FFFFFF">
      Tender Broiler &amp; Natti Chicken Cuts
    </text>
    <text x="0" y="42" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="600" font-size="22" fill="#E2E8F0">
      Fresh Country Desi &amp; High-Protein Farm Eggs delivered to your doorstep.
    </text>
  </g>

  <!-- 3 Feature Highlights (Bottom Left) -->
  <g transform="translate(96, 420)">
    <!-- Pill 1 -->
    <rect x="0" y="0" width="220" height="52" rx="14" fill="#000000" fill-opacity="0.35" stroke="#FFFFFF" stroke-opacity="0.15" />
    <text x="20" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="700" font-size="16" fill="#FDE047">🍗 7 Fresh Cuts</text>

    <!-- Pill 2 -->
    <rect x="236" y="0" width="230" height="52" rx="14" fill="#000000" fill-opacity="0.35" stroke="#FFFFFF" stroke-opacity="0.15" />
    <text x="256" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="700" font-size="16" fill="#86EFAC">💵 Cash on Delivery</text>

    <!-- Pill 3 -->
    <rect x="482" y="0" width="250" height="52" rx="14" fill="#000000" fill-opacity="0.35" stroke="#FFFFFF" stroke-opacity="0.15" />
    <text x="502" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="700" font-size="16" fill="#BAE6FD">📍 Srinivaspur Road</text>
  </g>

  <!-- Right Visual / Order Button Section -->
  <g transform="translate(860, 200)">
    <!-- Large Rounded Order CTA Card -->
    <rect x="0" y="0" width="230" height="240" rx="20" fill="#000000" fill-opacity="0.4" stroke="#F59E0B" stroke-width="2" />
    
    <!-- Phone / WhatsApp Hotline -->
    <text x="115" y="55" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="15" fill="#FCA5A5" letter-spacing="1">ORDER ONLINE AT</text>
    <text x="115" y="90" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="20" fill="#FEF08A">homemart4u.in</text>
    
    <!-- Divider -->
    <line x1="30" y1="115" x2="200" y2="115" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="1" />
    
    <!-- Call / WhatsApp -->
    <text x="115" y="148" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="700" font-size="13" fill="#E2E8F0">CALL / WHATSAPP</text>
    <rect x="25" y="165" width="180" height="46" rx="23" fill="#16A34A" />
    <text x="115" y="194" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="17" fill="#FFFFFF">90355 26638</text>
  </g>

  <!-- Bottom Website Footer Ribbon -->
  <g transform="translate(96, 524)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="600" font-size="15" fill="#CBD5E1">
      https://homemart4u.in • Fresh Chicken Centre, Srinivaspur Road, Mulbagal 563131
    </text>
  </g>
</svg>
`;

  // Render 1200x630 Banner PNG
  const bannerBuffer = await sharp(Buffer.from(svgBanner))
    .png({ quality: 90, compressionLevel: 8 })
    .toBuffer();

  const publicOgPath = path.resolve(__dirname, "../frontend/public/og-image.png");
  fs.writeFileSync(publicOgPath, bannerBuffer);
  console.log(` Created 1200x630 Open Graph banner: ${publicOgPath} (${(bannerBuffer.length / 1024).toFixed(1)} KB)`);

  // Render 512x512 Square Logo PNG (ideal for WhatsApp contact/group preview & square fallback)
  const svgSquare = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sqBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#991B1B" />
      <stop offset="100%" stop-color="#450A0A" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#sqBg)" />
  <rect x="16" y="16" width="480" height="480" rx="84" fill="none" stroke="#F59E0B" stroke-width="4" stroke-opacity="0.5" />
  
  <!-- Rooster Emoji / Icon Centered -->
  <g transform="translate(256, 210) scale(1.6)">
    <circle cx="0" cy="0" r="70" fill="#DC2626" />
    <circle cx="0" cy="0" r="62" fill="#B91C1C" />
    <text x="0" y="24" text-anchor="middle" font-size="68">🍗</text>
  </g>
  
  <text x="256" y="375" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="46" letter-spacing="-1">
    <tspan fill="#FFFFFF">HOME</tspan><tspan fill="#FEF08A">MART</tspan><tspan fill="#F59E0B">4U</tspan>
  </text>
  <text x="256" y="420" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="16" letter-spacing="3" fill="#FCA5A5">
    FRESH MEAT &amp; EGGS • MULBAGAL
  </text>
</svg>
`;

  const squareBuffer = await sharp(Buffer.from(svgSquare))
    .png({ quality: 90, compressionLevel: 8 })
    .toBuffer();

  const publicSquarePath = path.resolve(__dirname, "../frontend/public/og-logo.png");
  fs.writeFileSync(publicSquarePath, squareBuffer);
  console.log(` Created 512x512 Square Logo: ${publicSquarePath} (${(squareBuffer.length / 1024).toFixed(1)} KB)`);
}

generateOgImages().catch(err => {
  console.error("Failed to generate OG images:", err);
  process.exit(1);
});

