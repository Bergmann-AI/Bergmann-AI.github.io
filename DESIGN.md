---
name: Bergmann AI
description: KI-Chatbots, Automatisierung und Websites für kleine Betriebe, als ruhiger Text auf der Nacht über der Erde gesetzt.
colors:
  ivory: "#f3eee2"
  champagne: "#d9c9a3"
  warm-grey: "#bcb8ae"
  night: "#06070a"
  deep-night: "#02040b"
  sheet: "#121419"
  ink-dark: "#0b0d12"
  ink-soft: "#4f4a41"
  bronze: "#6f5c37"
  cream: "#ead9bd"
  ink-cream: "#47423a"
  bronze-cream: "#65532f"
  veil: "rgba(2, 4, 11, 0.72)"
  hairline: "rgba(243, 238, 226, 0.16)"
  hairline-strong: "rgba(243, 238, 226, 0.3)"
  tint: "rgba(255, 255, 255, 0.08)"
  error-rose: "#ffb8ab"
  intro-ice: "#8cccff"
typography:
  display:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "clamp(40px, 3.81vw + 23.2px, 72px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "clamp(38px, 2.476vw + 28.34px, 64px)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-0.01em"
  title-large:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1.1
  title:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.15
  title-small:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.15
  price:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "\"tnum\" 1"
  lead:
    fontFamily: "Work, Work Sans, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Work, Work Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  body-small:
    fontFamily: "Work, Work Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Work, Work Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1
  code:
    fontFamily: "GMono, Geist Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.04em"
rounded:
  button: "2px"
  bar: "3px"
  sheet: "4px"
  logo: "8px"
  phone-screen: "8px"
  phone: "14px"
  circle: "50%"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "24px"
  s-6: "32px"
  s-7: "48px"
  s-8: "64px"
  s-9: "96px"
  item-gap-row: "40px"
  item-gap-column: "56px"
components:
  button-primary:
    backgroundColor: "{colors.ivory}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    height: "44px"
    padding: "0 24px"
  action-link:
    textColor: "{colors.champagne}"
    typography: "{typography.label}"
    height: "44px"
    padding: "0"
  choice-word:
    textColor: "{colors.warm-grey}"
    typography: "{typography.label}"
    height: "44px"
    padding: "0"
  choice-word-selected:
    textColor: "{colors.ivory}"
    typography: "{typography.label}"
    height: "44px"
  bubble-visitor:
    backgroundColor: "{colors.ivory}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "11px 15px"
  bubble-bot:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ivory}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "11px 15px"
  line-code:
    textColor: "{colors.champagne}"
    typography: "{typography.code}"
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.sheet}"
    padding: "28px"
---

# Design System: Bergmann AI

## Overview

**Creative North Star: "Schrift auf der Nacht"**

The page is set like an evening edition printed onto the night sky: the turning earth stays behind everything, and the content stands on it as plain text, without a single box. Headings speak in a narrow, upright serif with an italic second half; the reading text is a quiet sans in warm grey. Light comes from ivory type and a few champagne marks, never from glow.

The owner chose this world on 17.11.2026 from example pictures (look D, "nur Text, keine Umrandung") and retired the earlier light-blue glow and glass look. Density stays calm: each section holds one two-part heading and one group of content, kept together by space (40 to 56px gaps) instead of frames.

**Key Characteristics:**
- No cards, boards, panels, glass, halos or coloured borders around content; grouping is space and alignment.
- Instrument Serif 400 for every heading, name and price; Work Sans for everything people read or press.
- Ivory for type and the one filled button, champagne for links, line icons, diagram lines and highlights.
- A dark veil behind every section after the hero calms the earth so text keeps its contrast.

## Colors

Ivory and champagne on near-black, with the photographic earth as the only other colour.

### Primary
- **Ivory** (#f3eee2): headings, emphasis, the one filled button per action group, the visitor's speech bubbles, the diagram's station rings, focus outline.

### Secondary
- **Champagne** (#d9c9a3): the highlighted word in the hero (italic), every secondary action as a text link with an arrow, thin line icons, the route diagram's lines, list rings, price dots, line codes (C1, M2, B3), selection background.

### Tertiary
- **Intro Ice** (#8cccff): only the glass rim and slow light sweep of the intro word, set in assets/3d/film.js; the owner kept it blue on 17.11.2026. Never on the page itself.

### Neutral
- **Warm Grey** (#bcb8ae): body copy, descriptions, labels, the italic second half of section headings, unselected choice words.
- **Night** (#06070a): the navigation bar and the base ground; station fill in the diagram.
- **Deep Night** (#02040b): the page behind the earth canvas and the still earth picture.
- **Veil** (rgba(2, 4, 11, 0.72)): laid over the earth behind every section after the hero; the trust section fades into it from transparent over its first 220px.
- **Sheet** (#121419): the only floating surfaces, the request dialog and the chatbot consent note.
- **Ink Dark** (#0b0d12): text on ivory.
- **Hairline / Hairline Strong** (ivory at 16% / 30%): the navigation's bottom rule, input borders, the thin outline of the laptop and phone pictures. Price rows and questions have no rules; air parts them.
- **Tint** (white at 8%): the chatbot's speech bubbles and avatar.
- **Error Rose** (#ffb8ab): only form error text.

### Named Rules
**The No Light Blue Rule.** Hellblau (#8fe3ff) and the old line colours (#6ea8ff, #b9c9ff) are retired. Line codes keep their letters but not their colours. The one exception is the intro word, whose glass letters keep their ice-blue rim (Intro Ice).

**The One Fill Rule.** Ivory fill marks exactly one action per group; everything else is a champagne text link.

## Typography

**Display Font:** Instrument Serif 400 roman and italic (self-hosted WOFF2, SIL OFL; fallback Georgia)
**Body Font:** Work Sans 400/700 (self-hosted as the CSS family "Work"; fallback system-ui)
**Label/Mono Font:** Geist Mono 400 (self-hosted as "GMono"), only for line codes and diagram labels

**Character:** A tall, narrow editorial serif carries every name and heading; the plain sans keeps the reading text and the controls practical.

### Hierarchy
- **Display** (400, clamp(40px, 3.81vw + 23.2px, 72px), 1.02): the hero heading only, centred, the first word italic in champagne. Capped at 72px so the long, owner-chosen headline does not crowd the buttons.
- **Headline** (400, clamp(38px, 2.476vw + 28.34px, 64px), 1.04): section headings, a statement in ivory and an italic continuation in warm grey.
- **Title Large** (400, 34px, 1.1): trust promises, the three service names, the chosen trade, "Auf Wunsch erweiterbar".
- **Title** (400, 26px, 1.15): the six problems, FAQ questions, offer names; the turn sentence of the problem section is italic at 27px.
- **Title Small** (400, 22px, 1.15): office-automation items, chat names, the owner's name.
- **Price** (400, 30px, 1, tabular): setup and monthly prices; 22px for the monthly price below 1024px.
- **Lead** (Work Sans 400, 18px, 1.5): section intros.
- **Body / Body Small** (Work Sans 400, 16px / 14px): descriptions; item texts are 14px.
- **Label** (Work Sans 500, 15 to 16px): buttons, links, choice words.
- **Code** (Geist Mono 400, 13px, +0.04em): C1, M2, B3; 11 to 12px inside the route diagram.

### Named Rules
**The Roman Statement, Italic Continuation Rule.** A section heading is one sentence in roman ivory plus one in italic warm grey; never a label above it.

**The Serif Is Not Bold Rule.** Instrument Serif appears only at 400; emphasis comes from size and italics.

## Layout

One 1280px container with 80px gutters at desktop (24px on phones), the kit's 4/8 spacing scale, sections padded 120px above and 72px below and growing with their content. Groups of items sit in a 3-column grid with 40px row and 56px column gaps (2 columns below 1024px, 1 below 540px); the two trust promises sit side by side with 56px between; questions run in two columns from 900px. Prices are rows parted by 32px of air (no rules) that reflow at 1024 and 640px; questions are parted by 48px. The route diagram runs left to right at desktop and turns vertical below 900px.

The intro comes first: the word "Bergmann AI" (Playfair Display Italic, baked into a distance-field texture, not a web font) with the turning globe seen through its glass letters, which keep a cool ice-blue rim and light sweep; scrolling flies into the letters, then the hero rises over the earth. Without WebGL a still of the globe stands behind the page.

## Elevation & Depth

Flat. Depth is the earth itself behind a dark veil; content never lifts off the ground. Only the two floating layers carry a dark drop shadow, and all page text carries a soft dark shadow so it reads over bright parts of the earth.

### Shadow Vocabulary
- **Text lift** (`text-shadow: 0 1px 14px rgb(2 4 11 / .75)`): all text in main and the closing; none on ivory fills.
- **Float** (`0 24px 60px -18px rgb(0 0 0 / .8), 0 2px 8px rgb(0 0 0 / .3)`): the consent note; the request dialog uses `0 30px 80px -20px rgb(0 0 0 / .8)`.

### Named Rules
**The No Frame Rule.** No border, fill, glow or shadow around a group of content. If something needs grouping, give it space.

## Shapes

Nearly square: 2px corners on buttons, speech bubbles and inputs, 4px on the dialog, the consent note and the laptop screen, 14px only on the phone picture (8px on its screen and on the logo tile, 3px on the placeholder text bars inside the example websites). Circles for station rings, list rings, price dots, avatars and the status dot. Lines are 1px hairlines; diagram lines 1.2 to 1.4px in champagne at 40 to 55% opacity.

## Components

### Buttons
- **Shape:** 2px corners, 44px tall.
- **Primary:** ivory fill, ink-dark text, 0 24px padding, an arrow whose stem grows on hover.
- **Secondary:** a champagne text link without fill or border, with a drawn arrow after links; underlined on hover, 32px from the primary.

### Choice Words (industries, website examples)
- **Style:** plain Work Sans words in warm grey, 44px tap height.
- **Selected:** ivory with a 1px champagne underline 8px below.

### Items (problems, office automation, extras)
A thin champagne line icon (28px, 1.3 stroke) beside a serif title and a short warm-grey text; no tile behind the icon.

### Route Diagram (signature component)
Inputs, the AI flow and results as words beside ivory station rings, joined by thin champagne curves into one station left and one right of the four numbered steps; the error alarm hangs below on a dashed line. Light points ride the lines; reduced motion removes them.

### Chat Preview
A short conversation beside the chatbot card's words (desktop: words left, preview right): name and status, visitor bubbles in ivory on the right, the bot's in tint on the left. No window around it.

### Offer Rows
Rows without rules, 32px apart: champagne ring, serif name (the package marked by an italic champagne "Paket"), warm-grey description, serif prices, a champagne text link on the text edge.

### Navigation
Fixed 72px bar on night with an ivory hairline below, logo plus serif wordmark, Work Sans links, one ivory button; below 480px the button hides behind the menu toggle.

### Request Dialog and Consent Note
Sheet surface, 4px corners, hairline border, serif heading, square inputs with ivory focus outline.

## Subpage /websites/ (Websites für lokale Betriebe)

The owner's sales page for websites (decisions of 18, 20, 22, 23, 24 and 25.11.2026). It keeps every rule above, but it is set in daylight: since 24.11.2026 the sections that were brown (before that, night) stand on Cream, the others on Ivory, and there is no dark section any more. Its one object is a phone that shows the owner's template Luxus-Scroll live. Its one material is brown leather, from the owner's own pictures: the logo and, since 25.11.2026, every filled button.

### Cream and Ivory
- **Alternation:** cream sections and Ivory sections take turns (hero and the template scene, prices and the closing are cream; "Im Preis enthalten", the process and the questions are ivory). The step between them is soft (1.2:1): a change of paper, not of light. Every section carries data-theme="light" (dark type) and data-ground="cream" or "ivory".
- **Cream** (#ead9bd): the owner's colour #f7e6ca, one step darker (OKLCH lightness -0.04); the owner chose it from two previews on 24.11.2026. Hero, scene, prices, closing, the navigation and the phone menu.
- **Ink Dark** (#0b0d12, 14:1 on Cream): headings on every ground.
- **Leather** (owner, 25.11.2026: "dieses edelste Braun mit Leder wie auf dem Bild"): every filled button, in the navigation, the hero, the scene, "Im Preis enthalten", the closing, the phone menu, the request dialog and the skip link. websites/_werkzeuge/leder-knopf.py cuts a strip out of the owner's picture (websites/_werkzeuge/quellen/leder-inhaber.png, kept unchanged), lifts it slightly for small buttons (brightness 1.35, contrast 0.9, colour 1.12) and writes websites/assets/leder.webp (1280 x 112px, 28 KB). It is shown at a fixed 640px width, centred, so the grain is the same size on every button; --fill (#39140a, its mean brown) stands in while it loads. Ivory text on it: 12.9:1 on average, at least 6.6:1 on 95% of the area behind the words; a dark 1px text shadow keeps the words clear on the few light creases. Hover lays a warm glaze over it (inset rgb(255 222 190 / .08)), a 1px light edge on top gives it a little thickness.
- **Ink Cream** (#47423a, 7.2:1 on Cream, 8.6:1 on Ivory) and **Bronze Cream** (#65532f, 5.4:1 on Cream): reading text, the italic heading continuation and marks on cream (the italic "Websites", text links, tags). The navigation uses them on both grounds.
- **Ink Soft** (#4f4a41, 7.6:1 on Ivory) and **Bronze** (#6f5c37, 5.6:1 on Ivory): reading text and marks on Ivory. On cream they would fall to 6.4:1 and 4.7:1, hence the darker pair.
- **Dawn:** the scene ends in Cream → Ivory over its last 24svh on desktop (44svh until 25.11.2026), 20svh below 900px (--g-bottom, part of the scene's own background).
- **Request dialog:** an Ivory sheet (data-ground="ivory") over a warm dim (rgb(38 28 16 / .55)); inputs on Paper (#fbf9f3) with a #8c8273 edge (3.6:1), placeholder #6b6357 (5.6:1), errors in #9e3321 (6.2:1 on Ivory).
- **The One Fill Rule:** the filled button is Leather with Ivory text.
- **Navigation:** the bar always takes the exact colour of the ground under its lower edge (main.js samples the section grounds and their gradients); its type is dark everywhere.
- **Browser surfaces:** selection in Ink with Ivory text, scrollbar thumb #8f7650 on a Cream track (3.1:1), focus ring in Ink, theme-color Cream.

### The logo
- On this page the mark is the owner's leather logo (owner, 25.11.2026): the same B with the mountain, in dark brown leather with stitching and gold edges. It replaces the computed leather version of the same day.
- websites/_werkzeuge/logo-freistellen.py cuts it out of the owner's image (websites/_werkzeuge/quellen/logo-leder-inhaber.png, kept unchanged) and writes websites/assets/logo-leder.webp (128px, the B across 93% of the width like logo.webp, shown at 32px in the navigation and the footer). The cut-out is made for the light grounds of this page; a dark ground would need a cleaner one. A faint drop shadow (0 1px 1px, dark brown at 35%) lets it lie on the page like a piece of leather.
- The home page and the favicon keep the blue mark.

### Layout (desktop, from 900px)
- Hero and scene: content in the left six of twelve columns, the phone in the right six; every split starts its right column on grid line 7 (24px column gap).
- One phone only (owner, 25.11.2026): it stands still where the hero shows it, from the first pixel to the end of the scene's content, and only the template in it moves; then it scrolls away with the scene. Beside it each step of the scene stays at the phone's height (sticky, 30svh under the navigation) until the next one takes its place, so there is always text beside the phone and no empty stretch.
- After the scene there is no phone, and the text uses the full width (owner, 25.11.2026). The sections are as tall as their content (no minimum of one screen), so no screen is empty: "Im Preis enthalten" has its heading in columns 1 to 6 and its sentence in 7 to 12, top-aligned, and the seven items below in two halves (from 1024px; each item keeps 64px free on its right so the tag stays clear of the next one); the process shows its four steps side by side (from 1024px); the prices show four offers as 2 × 2 (owner, 25.11.2026; see "Prices" below); the questions run in two columns; the closing keeps its text in eight columns and sets the wordmark "Bergmann AI" across the whole content width (font size = container width / 4.66, measured from the typeface; indented .04em so the ink of the italic B starts on the left line).
- Below 900px everything stacks and there is one small phone only (owner, 23.11.2026): it stands under the hero text, runs the template live, scrolls up with the hero and then stays docked 16px under the navigation through the scene while the template scrolls in it; the scene's heading, step titles, step texts and button fade out over 64px before they reach its lower edge. It leaves with the end of the scene while the button still stands fully below it. The scene opens with an area without text (owner, 25.11.2026; 720svh above its heading, only with JavaScript): as soon as the phone has docked, it grows as you scroll, over 45svh, to nearly the height of the screen (at most its 776px base size, between the page margins, centred under the navigation); the page stands still while the whole template runs in it from top to bottom; then it shrinks back over 45svh and the heading comes in from below. With reduced motion the phone stays small and docked while the template runs. Its height is 36svh (240 to 400px) on tablets and 34svh (220 to 320px) on phones, so a little more than half of the screen stays free for reading. On short screens (below 560px high, a phone held sideways) it does not dock and scrolls away with the hero. The scene's large phone stage is gone there and stays only as the screen-reader description.

### Prices (owner, 25.11.2026)
- Four offers in the owner's order, highest price first: Website mit Chatbot, Website für lokale Betriebe, KI-Website mit Chatbot, KI-Website. Each row is one kind of website ("Website", "KI-Website", in italic Bronze at h3 size, with one honest sentence on what it is); beside it the two offers, first with, then without chatbot. From 1024px the row is 4 + 4 + 4 columns; from 768px name, sentence, prices and link of the two offers sit on shared rows (subgrid), so the prices line up even when a name wraps; below 768px everything stacks in the owner's order.
- Each offer: name (h3, "Paket" in italic Bronze), one line, the set-up price large, "Pflege pro Monat, freiwillig" with the monthly price, a text link to the request. No boxes, no badges beyond "Paket"; the rows are parted by air.
- Below: the new-customer discount as its own block ("10 %" in italic Bronze in an h3, one sentence, the leather button "Website mit Rabatt anfragen", which opens the request dialog with the discount ticked), then the three conditions in three columns under the offer columns, the legal line and the link to all offers.
- The request dialog lists the four offers and has a checkbox "Neukunden-Rabatt nutzen" (20px, accent Bronze Cream, the whole line is the target). The home page has the same four offers as rows in its price list, the same checkbox and a text link to the discount.

### The phone
- The one rounded object: 9 : 19.4, 52px corners at its 360 x 776 base size, a 2.6px metal ring (145° gradient, highlights on two corners) around black glass, 43.2px corners on the screen, a camera island, side keys. Drawn in CSS, so it stays sharp at every size.
- It never rotates (owner, 22.11.2026). One fixed phone (.device) lies between the section grounds and their text and is moved only by transform. Two HTML phones hold its places (.phone[data-pose]: hero and wandel), carry the screen-reader description and are the still fallback. On desktop it no longer glides from place to place (owner, 25.11.2026: it moved too much and was briefly covered by the navigation); it stands still at the hero place, as described under Layout.
- Its screen runs the template vorlagen/luxus-scroll in a 390 x 869 frame, scaled to the screen. On desktop the whole template runs from top to bottom between the first pixel and the end of the scene, while the phone stands still. Below 900px it scrolls only once the whole phone is in view (owner, 23.11.2026), and the whole template runs in the grown phone at the start of the scene; during the steps it then stands at its closing. Its placeholder testimonials are hidden in the phone.
- The template is loaded with ?handy=1 (owner, 25.11.2026), so that the four steps of the scene are true in the phone: reading text 16px, labels from 12px, controls at least 44px high, a call button beside "Flug planen" and a round chat button at the bottom right, in the template's own gold. Its typefaces stay; without ?handy=1 the template is the unchanged replica. The scene has four steps since the same day ("Eine Vorlage zum Ansehen" is gone): large type, a button to call, short loading time, a chatbot.
- Until the template has loaded, a still of its first frame stands in the screen (assets/handy/vorlage-zu-460/580.webp); the HTML phones show its opened hero (vorlage-start-300/460/580.webp).
- The chatbot bubble over the template appears at the step "Chatbot"; it wears the template's colours (cream, gold), not the page's. It stays hidden while the grown phone shows the whole template (below 900px).
- A soft shadow lies under the phone, at full strength on every ground since all of them are light; no glow anywhere.

### Motion on the subpage
- Load (once, CSS only): the hero heading rises word by word out of its line, then lead, buttons and the owner's name fade up; the phone glides up from below. Ease cubic-bezier(0.16, 1, 0.3, 1), 0.8 to 1.15s, staggered 70 to 100ms.
- The scene: its heading appears word by word as it scrolls into view (from 20% to full opacity), the steps light up at the reading line, and the template scrolls in the phone. This is the page's one authored moment, chosen by the owner ("edel wie die Vorlage").
- Everything else stands still while scrolling.
- Reduced motion: no load sequence, no word-by-word reveal; the phone follows the page without easing (on desktop it stands still anyway); the template follows the scroll directly and uses its own calm crossfades.

### Type additions
- Step, item, offer and question titles (h3): Instrument Serif 400 at 30px (28px tablet, 26px phone).
- Route numbers: italic Bronze at title size, inline before the title.
- Set-up prices: 46 to 64px; monthly prices 34px.

## Do's and Don'ts

### Do:
- **Do** let text stand on the veiled night ground and group it with 40 to 56px of space; part rows of prices and questions by air, not rules.
- **Do** set every heading, name and price in Instrument Serif 400, the second half of a section heading in italic warm grey.
- **Do** keep one ivory button per action group and make every other action a champagne text link with an arrow.
- **Do** draw icons as thin champagne lines beside the text.
- **Do** keep the veil behind every section after the hero.

### Don't:
- **Don't** put cards, boards, panels, glass, glow, halos or coloured borders around content (the owner's choice of 17.11.2026).
- **Don't** bring back light blue or the old line colours; line codes stay champagne mono letters. Only the intro's glass word stays blue.
- **Don't** use Bricolage Grotesque or a bold serif.
- **Don't** round corners beyond 4px, except the phone picture and circles.
- **Don't** set reading text in the serif or in Geist Mono.
