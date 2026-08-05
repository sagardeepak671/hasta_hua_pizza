# Be My Valentine 💗

A single-page interactive Valentine's card: three playable arcade games, a love meter, a quiz, a
plantable flower garden, a scrapbook, and a "No" button that runs away from your cursor.

**Zero dependencies.** No React, no build step, no npm install — three files, ~3,000 lines of
hand-written HTML, CSS and vanilla JavaScript. Open `index.html` and it works.

---

## Table of Contents

- [What's Inside](#whats-inside)
- [Running It](#running-it)
- [Deploying](#deploying)
- [Customising It](#customising-it)
- [How It's Built](#how-its-built)
- [Project Structure](#project-structure)
- [Browser Support](#browser-support)
- [Contributing](#contributing)

---

## What's Inside

### The ask

A Yes/No prompt where **the "No" button dodges the cursor** — it repositions itself on hover and
gets progressively harder to catch. Clicking "Yes" fires a canvas confetti burst.

### Arcade — three games, all hand-written

| Game | Mechanic |
|---|---|
| **Memory Match** | Card-flip pairs on a grid, with move and match counters |
| **Heart Catch** | Canvas game — catch falling hearts, three lives, live score |
| **Cupid Flap** | A Flappy-Bird-style side-scroller with collision detection and a persisted best score |

### Interactive sections

- **Love Meter** — enter two names, get a (suspiciously high) compatibility percentage with an
  animated fill bar
- **Reasons Why** — a generator that produces reasons on demand, with an auto-cycle mode
- **Love Quiz** — five questions with scored results
- **Virtual Bouquet** — click to plant flowers in a garden that persists as you build it
- **Scrapbook** — a media gallery section
- **Love Letter** — a modal with copy-to-clipboard and a regenerate button
- **Mascot** — a reactive companion that comments on what you're doing

### Presentation

Floating heart particles, animated gradient blobs, a sparkle layer, glassmorphism cards,
scroll-triggered reveals, scrollspy navigation highlighting, and a bottom-tab router that switches
views without a page reload.

---

## Running It

No toolchain required.

```bash
git clone https://github.com/<your-username>/hasta_hua_pizza.git
cd hasta_hua_pizza
open index.html            # macOS
# xdg-open index.html      # Linux
# start index.html         # Windows
```

Double-clicking the file works too.

### With a local server

Recommended if you add fetch-based features later, since `file://` blocks some APIs:

```bash
# Python 3
python3 -m http.server 8000

# Node
npx serve .
```

Then open **http://localhost:8000**.

---

## Deploying

`netlify.toml` is included and publishes the repository root as-is, with `Cache-Control: no-store`
so edits appear immediately rather than being served from cache.

**Netlify:**

```bash
npm i -g netlify-cli
netlify deploy --prod
```

Or connect the repository in the Netlify dashboard — no build command needed.

**GitHub Pages:** Settings → Pages → deploy from branch root. Works unmodified.

**Vercel / Cloudflare Pages / any static host:** upload the three files.

---

## Customising It

Everything is plain text — no build step means editing is immediate.

| Change | Where |
|---|---|
| Names, titles, section copy | `index.html` |
| The reasons list | `script.js`, the *Reasons Why generator* section (~line 1112) |
| Quiz questions and answers | `script.js`, the *Love Quiz* section (~line 1188) |
| Letter text | `script.js`, the *Love letter modal* section (~line 1487) |
| Colours, fonts, glass effect | CSS custom properties at the top of `styles.css` |
| Game difficulty | Constants in the *Heart Catch* (~line 142) and *Cupid Flap* (~line 380) sections |

`script.js` is organised into clearly commented blocks — search for `// ----------` to jump between
features.

---

## How It's Built

**One IIFE, no globals.** All of `script.js` lives inside a single immediately-invoked function, so
nothing leaks into `window`. Features are separated by comment banners rather than modules — which
keeps the whole thing loadable as one `<script>` tag with no bundler.

**Canvas for the games, DOM for everything else.** Heart Catch and Cupid Flap run their own
`requestAnimationFrame` loops on `<canvas>`; Memory Match is DOM-based because card flips are
cheaper as CSS transitions than as redraws.

**A hand-rolled view router.** Sections are marked `data-view`; the bottom tab bar toggles
`is-active`, giving SPA-style navigation without a framework or a hash router.

**CSS-driven ambience.** Floating hearts, gradient blobs and sparkles are CSS animations on
generated elements, not JavaScript loops — the background costs nothing while a game is running.

**IntersectionObserver for reveals and scrollspy.** Both the scroll-in animations and the nav
highlight use `IntersectionObserver` rather than scroll listeners, so scrolling stays smooth.

**Accessibility basics.** Decorative layers carry `aria-hidden`, the mascot bubble is
`aria-live="polite"`, buttons have labels, and nav landmarks are labelled.

---

## Project Structure

```
.
├── index.html      # 272 lines — all sections, semantic markup
├── styles.css      # 1,207 lines — glassmorphism, animations, responsive layout
├── script.js       # 1,552 lines — games, generators, router, effects
└── netlify.toml    # Static deploy config
```

---

## Browser Support

Any modern browser — Chrome, Firefox, Safari, Edge. Uses `IntersectionObserver`, CSS custom
properties, `backdrop-filter` and Canvas 2D. The layout is responsive; the games are playable on
touch devices.

---

## Contributing

Contributions are welcome — this is meant to be forked and made your own.

Ideas:

- Add sound effects with a mute toggle
- Persist high scores and the garden to `localStorage`
- Add a fourth game
- Add a share link that encodes the recipient's name in the URL
- Respect `prefers-reduced-motion` for the particle layers
- Full keyboard navigation for the games

```bash
git checkout -b feat/your-change
# open index.html and test in a browser
git commit -m "feat: describe your change"
```

Please keep it dependency-free — the no-build-step property is the point.

---

## License

Provided as-is. Fork it, change the names, send it to someone.
