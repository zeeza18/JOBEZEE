
# Codex Prompt — Jobezee Portfolio Generator (12 Themes + Editor)

---

## Project Overview

Build a portfolio generator system with the following file structure:

```
portfolio/
├── portfolio-editor.html        ← THE ONLY FILE users edit to change data + colors
├── portfolio-config.js          ← Shared JS config (user data + per-theme color tokens)
├── themes/
│   ├── 01-modern-minimal.html
│   ├── 02-bold-impactful.html
│   ├── 03-dark-sleek.html
│   ├── 04-warm-human.html
│   ├── 05-creative-studio.html
│   ├── 06-tech-cyber.html
│   ├── 07-classic-professional.html
│   ├── 08-vibrant-playful.html
│   ├── 09-editorial.html
│   ├── 10-glass-depth.html
│   ├── 11-nature-organic.html
│   └── 12-retro-vintage.html
```

**Key rule:** All 12 theme HTML files import `../portfolio-config.js`. They read user data and CSS variables from that one file. The user ONLY touches `portfolio-editor.html` to change anything — it writes to `portfolio-config.js` and shows a live preview inside an iframe.

---

## Part 1: `portfolio-config.js` — Shared Config File

This file exports a global `window.PORTFOLIO` object. All 12 HTML files read from it.

```js
window.PORTFOLIO = {
  // ─── USER DATA ───────────────────────────────────────────
  user: {
    name: "Alex Johnson",
    title: "Product Designer & Developer",
    tagline: "I craft digital experiences that people love.",
    email: "alex@example.com",
    phone: "+1 (555) 000-0000",
    location: "New York, USA",
    linkedin: "https://linkedin.com/in/alexjohnson",
    github: "https://github.com/alexjohnson",
    website: "https://alexjohnson.dev",
    avatar: "https://i.pravatar.cc/300", // placeholder
    bio: "I'm a multidisciplinary designer and developer with 5+ years of experience building products at the intersection of design, technology, and business. I believe great work comes from deep collaboration and relentless curiosity.",
    resumeUrl: "#"
  },

  // ─── SKILLS ──────────────────────────────────────────────
  skills: [
    { name: "UI/UX Design", level: 92 },
    { name: "React / Next.js", level: 88 },
    { name: "Python", level: 75 },
    { name: "Figma", level: 95 },
    { name: "Node.js", level: 70 },
    { name: "Data Analysis", level: 65 }
  ],

  // ─── EXPERIENCE ──────────────────────────────────────────
  experience: [
    {
      company: "Stripe",
      role: "Senior Product Designer",
      period: "2022 – Present",
      description: "Led redesign of the merchant dashboard, improving task completion rate by 34%. Collaborated with 3 engineering teams across 2 product areas."
    },
    {
      company: "Shopify",
      role: "UX Engineer",
      period: "2020 – 2022",
      description: "Built accessible component library used by 60+ internal teams. Reduced design-dev handoff time by 40%."
    },
    {
      company: "Freelance",
      role: "Designer & Developer",
      period: "2018 – 2020",
      description: "Delivered 25+ projects for clients across fintech, healthcare, and e-commerce."
    }
  ],

  // ─── PROJECTS ────────────────────────────────────────────
  projects: [
    {
      title: "DashKit",
      description: "An open-source analytics dashboard template built with React and Recharts. 1,200+ GitHub stars.",
      tags: ["React", "TypeScript", "Recharts"],
      image: "https://picsum.photos/seed/dashkit/600/400",
      liveUrl: "#",
      githubUrl: "#",
      featured: true
    },
    {
      title: "Flowboard",
      description: "A Kanban-style project management tool with real-time collaboration powered by WebSockets.",
      tags: ["Next.js", "Supabase", "Tailwind"],
      image: "https://picsum.photos/seed/flowboard/600/400",
      liveUrl: "#",
      githubUrl: "#",
      featured: true
    },
    {
      title: "Palette Studio",
      description: "AI-powered color palette generator for designers. Generates accessible palettes from a seed color.",
      tags: ["Python", "FastAPI", "Vue.js"],
      image: "https://picsum.photos/seed/palette/600/400",
      liveUrl: "#",
      githubUrl: "#",
      featured: false
    },
    {
      title: "NutriTrack",
      description: "Mobile-first nutrition tracking app with barcode scanning and macro breakdowns.",
      tags: ["React Native", "Firebase"],
      image: "https://picsum.photos/seed/nutri/600/400",
      liveUrl: "#",
      githubUrl: "#",
      featured: false
    }
  ],

  // ─── EDUCATION ───────────────────────────────────────────
  education: [
    {
      school: "Carnegie Mellon University",
      degree: "B.S. in Human-Computer Interaction",
      period: "2014 – 2018",
      note: "Minor in Computer Science"
    }
  ],

  // ─── PER-THEME COLOR TOKENS ──────────────────────────────
  // Each theme reads ONLY its own block. The editor modifies these.
  themes: {
    "modern-minimal": {
      "--color-bg": "#FAFAFA",
      "--color-surface": "#FFFFFF",
      "--color-primary": "#18181B",
      "--color-accent": "#2563EB",
      "--color-text": "#09090B",
      "--color-muted": "#71717A",
      "--color-border": "#E4E4E7",
      "--font-heading": "'Archivo', sans-serif",
      "--font-body": "'Space Grotesk', sans-serif"
    },
    "bold-impactful": {
      "--color-bg": "#0A0A0A",
      "--color-surface": "#141414",
      "--color-primary": "#FFFFFF",
      "--color-accent": "#FF3B00",
      "--color-text": "#F5F5F5",
      "--color-muted": "#888888",
      "--color-border": "#2A2A2A",
      "--font-heading": "'Bebas Neue', sans-serif",
      "--font-body": "'Inter', sans-serif"
    },
    "dark-sleek": {
      "--color-bg": "#0D0D0D",
      "--color-surface": "#161616",
      "--color-primary": "#E8E8E8",
      "--color-accent": "#C9A96E",
      "--color-text": "#EFEFEF",
      "--color-muted": "#666666",
      "--color-border": "#262626",
      "--font-heading": "'Syne', sans-serif",
      "--font-body": "'DM Sans', sans-serif"
    },
    "warm-human": {
      "--color-bg": "#FAF7F2",
      "--color-surface": "#FFFFFF",
      "--color-primary": "#2C2416",
      "--color-accent": "#C0622B",
      "--color-text": "#2C2416",
      "--color-muted": "#8C7B6B",
      "--color-border": "#E8DDD2",
      "--font-heading": "'Lora', serif",
      "--font-body": "'Inter', sans-serif"
    },
    "creative-studio": {
      "--color-bg": "#F0EDEB",
      "--color-surface": "#FFFFFF",
      "--color-primary": "#1A1A1A",
      "--color-accent": "#7B5EA7",
      "--color-text": "#1A1A1A",
      "--color-muted": "#888888",
      "--color-border": "#DDDAD6",
      "--font-heading": "'Clash Display', sans-serif",
      "--font-body": "'General Sans', sans-serif"
    },
    "tech-cyber": {
      "--color-bg": "#040A10",
      "--color-surface": "#071018",
      "--color-primary": "#00FF88",
      "--color-accent": "#00BFFF",
      "--color-text": "#C8D6DF",
      "--color-muted": "#4A6070",
      "--color-border": "#0F2030",
      "--font-heading": "'JetBrains Mono', monospace",
      "--font-body": "'Fira Code', monospace"
    },
    "classic-professional": {
      "--color-bg": "#F8F8F6",
      "--color-surface": "#FFFFFF",
      "--color-primary": "#1B2A4A",
      "--color-accent": "#2A5298",
      "--color-text": "#1B2A4A",
      "--color-muted": "#6B7B8D",
      "--color-border": "#DDE2E8",
      "--font-heading": "'Playfair Display', serif",
      "--font-body": "'Source Sans Pro', sans-serif"
    },
    "vibrant-playful": {
      "--color-bg": "#FFFBF0",
      "--color-surface": "#FFFFFF",
      "--color-primary": "#1A1A2E",
      "--color-accent": "#FF6B6B",
      "--color-text": "#1A1A2E",
      "--color-muted": "#888888",
      "--color-border": "#FFE0D6",
      "--font-heading": "'Plus Jakarta Sans', sans-serif",
      "--font-body": "'Nunito', sans-serif"
    },
    "editorial": {
      "--color-bg": "#FDFCFA",
      "--color-surface": "#FFFFFF",
      "--color-primary": "#111111",
      "--color-accent": "#E63946",
      "--color-text": "#111111",
      "--color-muted": "#777777",
      "--color-border": "#E8E4DF",
      "--font-heading": "'Playfair Display', serif",
      "--font-body": "'IBM Plex Serif', serif"
    },
    "glass-depth": {
      "--color-bg": "#0F0C29",
      "--color-surface": "rgba(255,255,255,0.08)",
      "--color-primary": "#FFFFFF",
      "--color-accent": "#A78BFA",
      "--color-text": "#F0F0FF",
      "--color-muted": "#8888BB",
      "--color-border": "rgba(255,255,255,0.12)",
      "--font-heading": "'Outfit', sans-serif",
      "--font-body": "'DM Sans', sans-serif"
    },
    "nature-organic": {
      "--color-bg": "#F4F1EC",
      "--color-surface": "#FEFCF8",
      "--color-primary": "#2C3E2D",
      "--color-accent": "#5C7A3E",
      "--color-text": "#2C3E2D",
      "--color-muted": "#7A8C6E",
      "--color-border": "#D8D0C4",
      "--font-heading": "'Cormorant Garamond', serif",
      "--font-body": "'Jost', sans-serif"
    },
    "retro-vintage": {
      "--color-bg": "#F5F0E8",
      "--color-surface": "#FDF8EF",
      "--color-primary": "#2E1A0E",
      "--color-accent": "#B5451B",
      "--color-text": "#2E1A0E",
      "--color-muted": "#8C7060",
      "--color-border": "#DDD0BC",
      "--font-heading": "'Arvo', serif",
      "--font-body": "'Karla', sans-serif"
    }
  }
};
```

---

## Part 2: `portfolio-editor.html` — The One File to Rule Them All

This is the central editor. It must include:

### Left Panel — Data Editor
A form with inputs for every field in `window.PORTFOLIO.user`, skills, projects, experience, education. Changes are reflected live in the preview iframe.

### Right Panel — Theme Selector + Color Editor
- Grid of 12 theme cards (thumbnail previews). Clicking selects the active theme.
- After selecting a theme, show a **color editor** with color pickers for each CSS variable token in that theme's config block:
  - Background color
  - Surface color  
  - Primary color
  - Accent color
  - Text color
  - Muted color
  - Border color
  - Font choices (dropdowns: Google Fonts)
- A live preview iframe below that shows the selected theme with the user's current data and chosen colors.

### Bottom Bar — Actions
- `Save to Config` button: writes the current editor state back to `portfolio-config.js` (for local dev use, or display the updated JSON in a copyable textarea)
- `Open in New Tab` button: opens the selected theme file in a new tab
- `Download HTML` button: generates the theme HTML with the config inlined and downloads it as a `.html` file

### Editor UI Requirements
- Split layout: sidebar (data form, 380px) | main area (theme selector + preview)
- The preview iframe auto-refreshes when any input changes (debounced 400ms)
- Show a "Copied!" toast when user copies config
- All inputs styled with clean, neutral design (not themed — this is a tool, not a portfolio)
- Use CSS variables from the editor's own neutral palette: `--editor-bg: #F5F6FA`, `--editor-surface: #FFFFFF`, `--editor-accent: #2563EB`
- Google Fonts CDN for fonts in previews
- NO backend required — everything works in-browser using `localStorage` to persist state

---

## Part 3: All 12 Theme HTML Files

### Common Rules for Every Theme File

1. **Import config:** First script tag: `<script src="../portfolio-config.js"></script>`
2. **Apply tokens:** On load, read `window.PORTFOLIO.themes["theme-slug"]` and apply each CSS variable to `:root`
3. **Render data:** Use `window.PORTFOLIO.user`, `.projects`, `.skills`, `.experience`, `.education`
4. **Sections every theme must have:**
   - Hero (name, title, tagline, avatar, CTA buttons: email + resume)
   - Projects (show all `featured: true` first, then rest; show tags, image, links)
   - Skills (progress bars or visual indicators)
   - Experience (timeline format)
   - Education
   - Contact (email, links)
5. **Navigation:** Sticky top nav with smooth scroll links to each section
6. **Performance:** Use Intersection Observer for scroll animations (`prefers-reduced-motion` respected)
7. **Responsive:** Must work at 375px, 768px, 1024px, 1440px
8. **No external JS frameworks** — vanilla JS only. Tailwind CDN is allowed.
9. **Accessibility:** All images have `alt`, icons have `aria-label`, min 4.5:1 contrast
10. **All clickable elements** have `cursor: pointer`

---

### Theme 1: `01-modern-minimal.html`
**Slug:** `modern-minimal`

**Design spec:**
- Whitespace-heavy, single-column layout, max-width 800px centered
- Thin top nav: name on left, links on right (weight 400, small caps)
- Hero: Large name (clamp 48px–96px, Archivo 700), subtitle in muted, short tagline, two ghost buttons
- Projects: Clean card grid (2 cols desktop, 1 col mobile), cards with 1px border, image on top, hover lifts card (translateY -4px, shadow)
- Skills: Text list with percentage numbers right-aligned, thin progress bars
- Experience: Left border timeline (2px solid accent)
- Animations: Fade-up on scroll (transform: translateY(30px) → 0, opacity 0 → 1, 500ms ease)
- **No decorative shapes. No gradients. Pure whitespace.**

---

### Theme 2: `02-bold-impactful.html`
**Slug:** `bold-impactful`

**Design spec:**
- Full-width dark layout, background `#0A0A0A`
- Hero: Full viewport height. Name in Bebas Neue, massive (clamp 80px–160px), split into two lines, accent color on last word. Animated cursor blink after name.
- A bold horizontal rule (4px accent color) separating sections
- Projects: Horizontal scroll cards on mobile, 3-col grid desktop. Cards are dark with thick left accent border. Hover: accent color wash background.
- Skills: Stacked bars — thick, high-contrast, full-width blocks
- Experience: Numbered list (01, 02, 03) in large accent font
- Nav: Minimal top nav, all caps, tracking-widest
- Section headers: All caps, letter-spacing: 0.2em, thin underline
- Animations: Entrance animations — text slides in from left on scroll

---

### Theme 3: `03-dark-sleek.html`
**Slug:** `dark-sleek`

**Design spec:**
- Ultra-dark background `#0D0D0D`, gold/copper accent `#C9A96E`
- Hero: Centered layout. Small avatar with gold circular border. Name in Syne, elegant. Subtle animated gradient glow behind avatar.
- Projects: Dark cards with 1px gold border, subtle inner glow on hover. Image fills top 50% of card. Gold tag badges.
- Skills: Circular/arc progress indicators (SVG). Gold stroke on dark circle.
- Experience: Minimal timeline — dots in gold, thin connecting line
- Nav: Transparent on top, gold text. Blurs background on scroll (backdrop-filter: blur(10px))
- Typography: Syne headings feel premium and geometric
- Micro-animations: Gold shimmer line sweeps across hero on load (CSS animation)

---

### Theme 4: `04-warm-human.html`
**Slug:** `warm-human`

**Design spec:**
- Cream/off-white background `#FAF7F2`, terracotta accent
- Hero: Asymmetric split — left is text, right is large avatar with soft drop shadow and rounded corners (border-radius: 20px). Warm tone overlay on avatar image.
- Projects: Cards with rounded corners (16px), warm border, subtle inner shadow. No harsh lines — everything is rounded.
- Skills: Dot grid indicators (5 dots per skill, filled dots in accent, empty in muted)
- Experience: Storytelling layout — timeline with company logos (placeholder circle initials in accent color)
- Section backgrounds alternate: `#FAF7F2` and `#FFFFFF`
- Fonts: Lora headings feel personal and literary
- Decorative: Subtle wavy SVG divider between sections
- Animations: Soft fade-in, no aggressive movement

---

### Theme 5: `05-creative-studio.html`
**Slug:** `creative-studio`

**Design spec:**
- Broken/asymmetric grid layout — NOT centered, NOT predictable
- Hero: Name overlaps a large abstract shape (SVG blob, purple accent fill). Text rotated slightly (-2deg) as a design choice.
- Projects: Masonry grid using CSS columns or grid-template-rows. Cards have different heights. Some span 2 columns.
- Skills: Scattered badge layout — pill tags scattered with slight rotations (-3deg, 2deg, -1deg)
- Experience: Bold company name in large type, role in smaller muted text, overlapping layout
- Section transitions: Diagonal clip-path dividers (`clip-path: polygon(0 0, 100% 5%, 100% 100%, 0 95%)`)
- Typography: Clash Display headings with mixed weights — 300 and 700 in same heading (bold first word only)
- Animations: Scroll-triggered entrance with GSAP-style feel (use vanilla JS + CSS transitions)

---

### Theme 6: `06-tech-cyber.html`
**Slug:** `tech-cyber`

**Design spec:**
- Deep dark `#040A10`, matrix/terminal aesthetic
- Hero: Animated typewriter effect for the title. Monospace font for everything. Green `#00FF88` accent text. A blinking cursor `|` after the typed text.
- Background: Subtle grid pattern (CSS `background-image: linear-gradient` grid lines in low opacity `#0F2030`)
- Projects: Cards styled like terminal windows — top bar with three dots (red/yellow/green), `>` prefix on title, code-block style tags
- Skills: Progress bars look like terminal loading bars `[████████░░] 80%` rendered in monospace
- Experience: Styled like a `git log` or CLI output: `● [2022-Present] Stripe — Senior Designer`
- Nav: Terminal top bar style with `~/portfolio` as path
- Scanline overlay: A very subtle CSS repeating-linear-gradient scanline effect over the page (opacity: 0.03)
- Animations: Text flicker effect on headings (brief opacity drop then restore), glow pulse on accent elements

---

### Theme 7: `07-classic-professional.html`
**Slug:** `classic-professional`

**Design spec:**
- Ivory background `#F8F8F6`, navy primary, traditional layout
- Hero: Traditional header — name in large Playfair Display serif, title below, horizontal rule, then summary text. Clean, document-like.
- Two-column layout: Main content (projects, experience) takes 65%, sidebar (skills, education, contact) takes 35%
- Projects: Text-first cards — no image by default (image is optional thumbnail on right). Bullet points for key achievements.
- Skills: Clean list with years of experience noted: `React — 5 years`, `Figma — 4 years`
- Experience: Traditional resume-style — bold company, dates right-aligned, indented bullet points
- Typography: Playfair Display headings, Source Sans Pro body — scholarly and trustworthy
- Colors: Very conservative. Only accent color for links and section markers.
- Print-ready: Include `@media print` styles for clean PDF export

---

### Theme 8: `08-vibrant-playful.html`
**Slug:** `vibrant-playful`

**Design spec:**
- Light background `#FFFBF0` with bold multi-color blocks
- Hero: Big rounded rectangle background block behind name (coral `#FF6B6B`). Name in Plus Jakarta Sans, bold. Emoji-free — use SVG icons.
- Section dividers: Thick zig-zag or wavy SVG borders in accent colors
- Projects: Thick-bordered cards (3px border in rotating accent colors: coral, teal, yellow, purple). Tags are chunky pill badges.
- Skills: Big bold percentage numbers (`92%`) next to skill names, with confetti-style small colored dots scattered around
- Experience: Speech-bubble style cards — triangle pointer on the left
- Colors: The page uses 4 accent colors (coral, teal, yellow, purple) for variety — but they're still controlled by the config's `--color-accent` as the primary, with 3 hard-coded supporting accents.
- Animations: Bouncy `cubic-bezier(0.34, 1.56, 0.64, 1)` spring-style transitions on hover

---

### Theme 9: `09-editorial.html`
**Slug:** `editorial`

**Design spec:**
- Magazine layout, print-inspired, high contrast
- Hero: Full-width section. Name split across 2 lines in giant Playfair Display. A byline below: role + location. A pull-quote from the tagline styled as an editorial pull-quote (large, italic, accent color, centered).
- Projects: Editorial grid — one featured project spans full width with large image and article-style writeup. Remaining in 3-column grid.
- Skills: Clean horizontal rule-separated list in two columns, like a magazine sidebar
- Experience: Article-style — company name as section H2, dates as metadata, prose description
- Typography: Strict typographic hierarchy. `font-size` scale: 12, 14, 16, 20, 28, 40, 64, 96px. `font-weight` scale: 400, 600, 800.
- Drop caps: First letter of bio section is a styled drop cap (`::first-letter`)
- Columns: Use `column-count: 2` for the bio on desktop
- Animations: Elegant fade-in only. No sliding or bouncing.

---

### Theme 10: `10-glass-depth.html`
**Slug:** `glass-depth`

**Design spec:**
- Deep purple-dark background `#0F0C29` with animated gradient mesh
- Background: Animated SVG gradient mesh with soft aurora effect (3 blobs: purple `#7B3FE4`, blue `#2563EB`, magenta `#E040FB` — each moving slowly with `@keyframes` using transform + filter)
- All cards: Glassmorphism — `background: rgba(255,255,255,0.08)`, `backdrop-filter: blur(16px)`, `border: 1px solid rgba(255,255,255,0.12)`, `border-radius: 20px`
- Hero: Floating glass card, centered, name in white Outfit font, animated gradient text effect on tagline
- Projects: Glass cards float above the gradient background. Hover: slight scale (1.02) + brighter border
- Skills: Glass pills with percentage inside, floating layout
- Nav: Glass navbar, `backdrop-filter: blur(20px)`, floating with `top: 16px; left: 16px; right: 16px; border-radius: 16px`
- Contact: Frosted glass section with glowing accent border
- Animations: Smooth float animations on cards (`@keyframes float: 0% translateY(0) → 50% translateY(-8px) → 100% translateY(0)`), staggered scroll entrance

---

### Theme 11: `11-nature-organic.html`
**Slug:** `nature-organic`

**Design spec:**
- Warm paper/linen background `#F4F1EC`, forest green accent
- Decorative: SVG leaf/branch illustrations in section corners (simple, line-art style, `stroke: var(--color-accent)`, `fill: none`)
- Hero: Centered. Large Cormorant Garamond heading (elegant, slightly condensed). A circular avatar with a botanical SVG frame around it.
- Section dividers: Flowing organic wave SVG (not geometric — soft, natural curves)
- Projects: Cards with soft rounded corners, a subtle paper texture overlay (`background-blend-mode: multiply`), hover adds a leaf-green glow
- Skills: Tree/branch metaphor — main skill is a root, sub-skills branch out (CSS + SVG tree layout OR pill badges with green fill)
- Experience: Soft timeline with leaf dot markers
- Typography: Cormorant Garamond headings (tall x-height, elegant), Jost body (clean, modern contrast)
- Colors: Stick to earthy palette — no bright neons, nothing synthetic
- Animations: Very slow, gentle fades. Like watching something grow.

---

### Theme 12: `12-retro-vintage.html`
**Slug:** `retro-vintage`

**Design spec:**
- Aged parchment background `#F5F0E8`, rust red accent `#B5451B`
- Texture overlay: Subtle grain/noise texture over the entire page (CSS `filter: url(#noise)` SVG filter or `background-image` with base64 noise)
- Hero: Vintage poster layout. Name in Arvo bold, centered. Decorative horizontal rules above and below (double-line style: `border-top: 3px double`). A badge-style circle element with the user's initials.
- Projects: Cards styled like old catalog entries — project number (01, 02, 03), ruled lines, stamp-style image frame
- Skills: Vintage-style label design — skills in rectangular bordered boxes that look like old price tags
- Experience: Timeline styled like a historical document — dates in a different rust color, company names with small caps
- Typography: Arvo headings (slab serif, sturdy), Karla body (humanist, readable)
- Decorative: Ornamental divider SVG (simple flourish line) between each section
- Colors: Muted throughout. The accent color is the only vivid element.
- Animations: Minimal — only opacity fade, no movement (respects the aged, still aesthetic)

---

## Part 4: Implementation Details

### How Each Theme Reads the Config

At the top of every theme file, include this script (before `</head>`):

```html
<script src="../portfolio-config.js"></script>
<script>
  // Apply CSS variables for this theme
  const THEME_SLUG = "modern-minimal"; // change per file
  const tokens = window.PORTFOLIO.themes[THEME_SLUG];
  const root = document.documentElement;
  Object.entries(tokens).forEach(([key, val]) => root.style.setProperty(key, val));
</script>
```

All CSS in the file uses `var(--color-bg)`, `var(--color-accent)`, etc. — never hardcoded hex values (except the 3 supporting accent colors in `vibrant-playful` which are intentional design choices).

### CSS Variable Usage Pattern

```css
body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
}

h1, h2, h3 {
  font-family: var(--font-heading);
  color: var(--color-primary);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.accent { color: var(--color-accent); }
.muted { color: var(--color-muted); }
```

### Google Fonts in Theme Files

Each theme includes its specific Google Fonts import in `<head>`. The fonts must match what's defined in the config for that theme:

| Theme | Heading Font | Body Font |
|-------|-------------|-----------|
| modern-minimal | Archivo | Space Grotesk |
| bold-impactful | Bebas Neue | Inter |
| dark-sleek | Syne | DM Sans |
| warm-human | Lora | Inter |
| creative-studio | Clash Display (CDN: use Raleway as fallback) | General Sans (fallback: Inter) |
| tech-cyber | JetBrains Mono | Fira Code |
| classic-professional | Playfair Display | Source Sans Pro |
| vibrant-playful | Plus Jakarta Sans | Nunito |
| editorial | Playfair Display | IBM Plex Serif |
| glass-depth | Outfit | DM Sans |
| nature-organic | Cormorant Garamond | Jost |
| retro-vintage | Arvo | Karla |

### Scroll Animation Pattern (Vanilla JS)

Add to every theme file:

```js
// Scroll reveal animation
const observer = new IntersectionObserver((entries) => {
  entries.forEach(el => {
    if (el.isIntersecting) {
      el.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
```

```css
.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
}
```

Add class `reveal` to every section, card, and hero element.

### Editor Live Preview Pattern

In `portfolio-editor.html`, the preview iframe uses `srcdoc`:

```js
function updatePreview() {
  const theme = getCurrentTheme(); // e.g. "01-modern-minimal.html"
  const iframe = document.getElementById('preview');
  // Load the theme file in the iframe
  iframe.src = `themes/${theme}`;
  // After iframe loads, inject updated config
  iframe.onload = () => {
    iframe.contentWindow.PORTFOLIO = getCurrentPortfolioData();
    // Re-apply CSS variables
    const tokens = getCurrentTheme tokens;
    Object.entries(tokens).forEach(([key, val]) => {
      iframe.contentDocument.documentElement.style.setProperty(key, val);
    });
    // Re-render content
    if (iframe.contentWindow.renderPortfolio) {
      iframe.contentWindow.renderPortfolio();
    }
  };
}
```

Each theme file must expose a `window.renderPortfolio()` function that re-reads `window.PORTFOLIO` and re-renders all dynamic content.

---

## Quality Checklist (Apply to every file)

- [ ] No emojis used as icons — use inline SVG (Heroicons/Lucide style)
- [ ] All interactive elements have `cursor: pointer`
- [ ] Hover states have `transition` (150–300ms)
- [ ] All images have `alt` attributes
- [ ] `prefers-reduced-motion` respected in all animations
- [ ] No horizontal scroll on mobile (375px)
- [ ] Text contrast minimum 4.5:1 against background
- [ ] Sticky nav does not overlap content (add padding-top to first section)
- [ ] All theme CSS vars used — no hardcoded colors except intentional exceptions noted above
- [ ] `viewport` meta tag present: `<meta name="viewport" content="width=device-width, initial-scale=1">`
- [ ] Smooth scroll: `html { scroll-behavior: smooth; }`
- [ ] Tab focus visible on all interactive elements

---

## Deliverables Summary

| File | Purpose |
|------|---------|
| `portfolio-config.js` | Single source of truth — user data + per-theme color tokens |
| `portfolio-editor.html` | Visual editor — change data, colors, preview, download |
| `themes/01-modern-minimal.html` | Clean, whitespace, type-first |
| `themes/02-bold-impactful.html` | Dark, huge type, commanding |
| `themes/03-dark-sleek.html` | Premium dark, gold accents |
| `themes/04-warm-human.html` | Earthy, rounded, personal |
| `themes/05-creative-studio.html` | Asymmetric, expressive, artistic |
| `themes/06-tech-cyber.html` | Terminal, neon, grid, monospace |
| `themes/07-classic-professional.html` | Serif, structured, print-ready |
| `themes/08-vibrant-playful.html` | Multi-color, rounded, energetic |
| `themes/09-editorial.html` | Magazine-style, pull quotes, columns |
| `themes/10-glass-depth.html` | Glassmorphism, aurora background |
| `themes/11-nature-organic.html` | Botanical, fluid, earthy |
| `themes/12-retro-vintage.html` | Grain texture, slab serif, parchment |

**Total: 14 files.**

When I need to change something (a color, a layout, a font), I will say "update X in theme Y" and you change ONLY that theme's file. If I say "update the config", you change ONLY `portfolio-config.js`. The editor file is changed only when I explicitly ask to change the editor UI.
