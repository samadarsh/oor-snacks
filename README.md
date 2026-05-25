# Oor Snacks

Premium traditional Tamil Nadu snacks — multi-page storefront with Supabase checkout and WhatsApp.

## Stack

- [Vite](https://vitejs.dev/) 8
- Vanilla HTML / CSS / JS
- [GSAP](https://greensock.com/gsap/) + [Lenis](https://lenis.darkroom.engineering/) for scroll and motion

## Development

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (defaults to `http://localhost:5180`; if that port is busy, Vite picks the next free port).

## Production build

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host (Netlify, Vercel, Cloudflare Pages, S3, etc.).

## Backend (Supabase)

Orders are saved to Supabase on checkout when `.env` is configured. Staff view orders at **`/admin.html`**.

Full setup: **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**

## Configuration

Edit **`src/config.js`** before launch:

- WhatsApp phone number
- Contact email and address
- Shipping fee and free-shipping threshold
- Production URL (for SEO; also update `public/sitemap.xml` and `public/robots.txt` if the domain changes)

Social preview image: **`public/og-image.webp`** (served at `/og-image.webp`).

## Project layout

| Path | Purpose |
|------|---------|
| `index.html` | Hero landing page |
| `products.html` | Product catalog (add to cart) |
| `shop.html` | Basket + checkout |
| `admin.html` | Staff order dashboard |
| `src/cart.js` | Shared cart state (`localStorage`) |
| `src/hero.js` / `products.js` / `shop.js` | Per-page scripts |
| `src/style.css` | Design system and layout |
| `src/config.js` | Site constants |
| `src/assets/` | Product and hero WebP images |
| `public/` | Static files copied as-is to build root |

## Design direction (Apple-inspired)

Phase 1 (current): calmer typography, generous section spacing, opacity-first motion, batched scroll reveals.

Later phases: sticky scrollytelling scenes, texture cinematography, AVIF assets — see project issues / roadmap.

## Staff portal (demo)

Footer link **Staff Portal (Demo)** shows orders stored in the browser’s `localStorage` (`oor_orders`). This is for prototyping only — not a shared backend.
