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
  veil: "rgba(2, 4, 11, 0.72)"
  hairline: "rgba(243, 238, 226, 0.16)"
  hairline-strong: "rgba(243, 238, 226, 0.3)"
  tint: "rgba(255, 255, 255, 0.08)"
  online-green: "#6fdc9c"
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
- **Online Green** (#6fdc9c): only the "online" dot of the chat example. **Error Rose** (#ffb8ab): only form error text.

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

### Chat Example
Only the conversation: name and status, a time, visitor bubbles in ivory on the right, the bot's in tint on the left, a hand-off note with a champagne check, and an input imitation in faint tint.

### Offer Rows
Rows without rules, 32px apart: champagne ring, serif name (the package marked by an italic champagne "Paket"), warm-grey description, serif prices, a champagne text link on the text edge.

### Navigation
Fixed 72px bar on night with an ivory hairline below, logo plus serif wordmark, Work Sans links, one ivory button; below 480px the button hides behind the menu toggle.

### Request Dialog and Consent Note
Sheet surface, 4px corners, hairline border, serif heading, square inputs with ivory focus outline.

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
