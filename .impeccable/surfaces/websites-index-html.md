---
version: 1
slug: "websites-index-html"
primary_target: "websites/index.html"
related_targets: []
---

# Surface: websites/index.html (Websites für lokale Betriebe)

Mode: Persuade. A sub-page of the Bergmann AI site that sells the website offer.

- Audience: owners and office leads of small local businesses, mostly arriving from a personal cold email, often on the phone.
- Job and action: understand what the new website does for their customers, what is included, how it runs and what it costs; then "Website anfragen" (request dialog to the existing n8n webhook, mailto fallback).
- Proof: no testimonials, references or figures exist. The page demonstrates instead: a phone that runs the owner's template Luxus-Scroll live and scrolls with the page (since 22.11.2026; before: an old site repaired step by step). Facts only from PRODUCT.md and the confirmed homepage copy.
- Owner decisions (18.11.2026): structure Vorher/Nachher; look dark and light sections in alternation (Bergmann AI colours and faces); no examples section until real client sites exist; a short four-step process is wanted on this page.
- Constraints: prices only from the middle of the page; no invented proof; Sie; no kicker labels; one filled button per action group.
- Memorable moment: the scene #vorlage (heading appears word by word, the template scrolls in the phone).
- Build notes (18.11.2026): one split line for the page (12 columns, right column at line 7); the owner line lost its logo for the taste edge rule; the dawn is a background layer. DESIGN.md is updated after the 3D round.
- 3D (owner choice 20.11.2026): one 3D phone (three.js) travels across the whole page on a fixed canvas between the section grounds and the text. Desktop lanes: content left, phone right; Preise has the phone between the offers (package hover opens the chat); Fragen sends it out to the right; the closing brings it back. Phones and tablets: hero and Wandel only. Every phone position is an HTML phone with data-pose, which is the no-WebGL fallback. The Wandel is the one big scene: the old site lifts off the glass in strips, the new one assembles behind them.
- Owner decisions (22.11.2026): chocolate brown instead of black in all dark sections, darkest at the top; the template Luxus-Scroll in the phone instead of the old site, scrolling with the page; the phone no longer rotates; motion "edel wie die Vorlage" (load sequence in the hero, the scene heading brightens word by word, the phone glides; other text stands still). Name and copy of the scene ("Vorlage", "So kann Ihre Website aussehen. Eine Vorlage zum Durchscrollen.", first step "Eine Vorlage zum Ansehen") are a proposal awaiting the owner's approval (approved with the copy round of 22.11.2026).
- Owner decision (23.11.2026), phones and tablets below 900px: the large phone in the scene is gone. The small hero phone runs the template live, scrolls up with the hero, docks under the navigation through the scene and leaves with its end; slightly larger than the former still, yet a little more than half of the screen stays free, and the scene's text fades before it reaches the phone. Desktop unchanged.
- Owner decisions (23.11.2026, second round): the brown is lighter and more luxurious (chocolate with a cognac tone: espresso #3f2619, umber #482c1d, mocha #533423). Below 900px the template in the phone starts scrolling only once the whole phone is in view; desktop unchanged.
- Owner decision (24.11.2026): cream instead of brown. The owner sent his colour #f7e6ca and chose, from two previews, the one a step darker: #ead9bd for the hero, the scene, the prices and the closing (also navigation and phone menu); the other sections stay ivory. The page is now light throughout, with dark type everywhere; reading text and marks on cream are a touch darker (#47423a, #65532f) so they keep 7:1 and 5.4:1. The request dialog is an ivory sheet.

## Direction contract

THESIS: The page proves the offer by letting the visitor scroll a finished premium website: one phone that travels with the reader and runs the owner's template live, scrolling as the page scrolls, while the ground turns from cream to ivory. It refuses the category default of a split laptop hero, a row of same-size feature cards and a testimonial strip.

OWN-WORLD: Bergmann AI's evening edition, set in daylight (since 24.11.2026; before: chocolate brown, before that night). Cream sections (#ead9bd, the owner's colour one step darker) and ivory sections (#f3eee2) take turns; both carry ink type, a warm dark reading grey and a darkened champagne (bronze) for marks. Instrument Serif 400 headings with an italic continuation, Work Sans text. No boxes, frames, glass or glow; one filled button per group (ivory on night, ink on ivory), every other action a text link with a drawn arrow; thin line icons; the phone is the only rounded object.

STORY: A business owner sees in seconds that this sells a new website for businesses like theirs, scrolls a finished template on the phone while reading what a new site does (readable, one tap to call, fast, a chatbot at night), learns what is included and how it runs, then reads two prices and sends a request.

FIRST VIEWPORT: Cream ground. Left six columns: h1 "Websites für lokale Betriebe" (Websites italic in bronze) at display size on two lines, the sub-line in the dark reading grey, the ink button "Website anfragen" plus the bronze link "Vorlage ansehen", a one-line note on what happens next, the owner line as text (Shawn Bergmann, Halle (Westf.)). Right half from grid line 7: one phone, whole, running the template (its blind rises over the window photo once it has loaded). The primary action sits inside the first screen at every width.

FORM: one object scroll story (since 22.11.2026; first built as Vorher/Nachher scroll repair, rank 4 of 6 grounded structures, the dealt lead). seed:da6fa70d6201d1f5

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
