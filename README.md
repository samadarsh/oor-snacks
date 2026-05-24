# Oor Snacks

Premium traditional Tamil Nadu snacks — marketing site with cart and WhatsApp checkout.

## Stack

- [Vite](https://vitejs.dev/) 8
- Vanilla HTML / CSS / JS
- [GSAP](https://greensock.com/gsap/) + [Lenis](https://lenis.darkroom.engineering/) for scroll and motion

## Development

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (default `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host (Netlify, Vercel, Cloudflare Pages, S3, etc.).

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
| `index.html` | Page markup and product catalog |
| `src/main.js` | Cart, checkout, animations |
| `src/style.css` | Design system and layout |
| `src/config.js` | Site constants |
| `src/assets/` | Product and hero WebP images |
| `public/` | Static files copied as-is to build root |
| `murukku_cinematic_animation.html` | Standalone motion prototype (not in build) |

## Staff portal (demo)

Footer link **Staff Portal (Demo)** shows orders stored in the browser’s `localStorage` (`oor_orders`). This is for prototyping only — not a shared backend.
