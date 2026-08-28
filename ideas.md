# Brand My Mac Clone — Visual Ground Truth

## Reference-First Direction

This implementation is a **faithful, original-code recreation** of the supplied reference at `brandmymac.com`. The defining visual character is a sparse, founder-built product page: nearly white space, precise black typography, small green proof points, compact navigation, and a single oversized interactive product object that visually carries the entire offer.

## Ground-Truth Specification

### Design Movement

Editorial Swiss minimalism, translated into a contemporary indie-founder launch page. The page should feel methodical, personal, and quietly confident rather than corporate or playful.

### Core Principles

1. **The product object is the hero.** The large, silver, laptop-lid object and its auction placement zones are always more visually important than adjacent copy.
2. **Typography carries hierarchy.** Large black display type, compact tabular labels, and fine gray helper text make the content feel structured without heavy borders.
3. **Green signals live activity.** A restrained leaf-green is reserved for raised totals, progress, active details, and successful confirmations.
4. **Function is visible.** Auction spots look selectable and bids look actionable; the page is a usable interface, not merely an advertisement.

### Color Philosophy

Use warm paper white and pale silver to keep the composition extremely light. Ink-black anchors titles and controls; quiet neutral grays give the laptop credible physical depth. A single saturated field green communicates momentum and growth without becoming a decorative accent.

### Layout Paradigm

Stacked editorial strips with generous vertical pauses. The hero uses a deliberately centralized product stage, while subsequent sections alternate between narrow narrative columns, edge-to-edge section dividers, and densely structured auction/specification content.

### Signature Elements

- A tactile **3D-style silver laptop lid** with a recessed auction-grid surface.
- Dashed, pale-yellow sticker-zone outlines on the laptop lid that brighten when selected.
- Micro-labels, hairline separators, and small green status dots used as operational UI evidence.

### Interaction Philosophy

Interactions should make the auction feel active but low-pressure. Hovering a zone lifts and brightens it; selecting a zone opens a concise bid panel with the selected slot context. Anchor navigation scrolls smoothly; lightweight submissions receive an immediate confirmation state.

### Animation

Use very restrained 160–260 ms transform and opacity transitions. The laptop gently rotates only as an ambient depth cue; individual sticker zones rise by 2–4 px on hover. Respect reduced-motion preferences and avoid perpetual high-attention animation.

### Typography System

**Manrope** supplies the large, geometric display headlines and tight navigation labels. **DM Mono** supplies price labels, slot metadata, specifications, and subtle live-status details. Headline tracking stays slightly negative; operational labels use modest positive tracking.

### Brand Essence

**A live auction that turns one founder’s laptop lid into visible brand inventory for curious internet companies.**

Personality: **resourceful, candid, precise**.

### Brand Voice

Headlines are direct and economic; calls to action are concrete. Avoid generic welcome language and hollow platform claims.

Example lines:

> Your logo, seen where work happens.

> Pick a tile. Make it travel.

### Wordmark & Logo

Use an ownable, minimal mark: a four-cornered lime-green decal with a cropped black center—suggesting a logo sticker being positioned on a laptop lid. Pair it with a custom-spaced wordmark constructed in the display typeface.

### Signature Brand Color

**Signal Green — `#23B35C`**. It marks live data and selected inventory only.

## Fidelity Rules

- The experience must retain the reference page’s core structure: header, funding proof, interactive laptop auction board, auction table, how-it-works, specification panel, FAQ, waitlist, founder note, and legal footer.
- Use original placeholder sponsor marks and fictional interaction feedback; do not copy third-party logos, personal portrait imagery, or the reference site’s exact proprietary visual files.
- Every component and CSS file begins with a brief comment that names the reference-first minimal auction design direction.

## Revision Reference — Supplied Images

The revised hero must use the user-supplied **silver MacBook lid PNG** as the physical base object, keeping its central logo visible and unmodified. The accompanying auction-board screenshot is the immediate layout reference: a light-silver rectangular lid, three large rounded tiles at the top, four compact tiles around the central logo, and three large tiles at the bottom. Dashed gray outlines, subdued shadows, centered brand tiles, and a compact segmented “Live auction / Final look” control take precedence over the earlier illustrative-laptop treatment.

The newest supplied reference tightens the page hierarchy further: a 54 px desktop header, a single-line mid-scale hero headline, smaller supporting copy, compact funding information, large quiet gaps, and a narrower auction board positioned low within the first viewport. Desktop typography must feel precise and airy, not oversized or stacked; mobile may return the headline to multiple lines to protect legibility.

The interaction reference adds two non-negotiable states. On desktop hover, a sticker tile should soften and blur its brand content while a centered electric-blue **Outbid** pill appears. On click, a white rounded bid modal appears over a dimmed and blurred version of the board. The modal includes selected slot details, bid amount, deposit calculation, company inputs, logo upload affordance, and a persistent blue completion control. The active design asks for a larger, more legible navigation and wordmark than the previous compact-header state.

## Style Decisions

- Auction tiles rest on sponsor identity, slot context, and bid data. The blue **Outbid** pill is hidden from the resting state and appears only on hover or inside the bid flow.
- Sponsor decal tints stay intentionally muted and material-like. Signal Green `#23B35C` remains exclusive to live status, progress, selected inventory, and successful states.
- The header signature pairs an enlarged lime decal mark with a deliberately tight, custom-spaced `brand my mac` wordmark rather than an understated navigation label.

## Final Look Component

The final-look mode is intentionally distinct from the live auction. It uses the user-supplied angled laptop photograph as a static product image and overlays one unified virtual sticker plane using ordinary DOM elements and responsive percentage placement. The sticker plane maintains clear access to the physical Apple logo through an explicit central exclusion zone, while the exposed `LID_CORNERS` constants document where to recalibrate the perspective treatment after replacing the source photograph.

The Final look is now calibrated against the latest transparent MacBook asset. A resize-aware outer scaler keeps an intrinsic `1536 × 1024` source space aligned with the responsive photograph, while a single `matrix3d()` homography maps the virtual `1000 × 700` sticker board onto its lid polygon. Individual stickers have no transforms, creating a shared physical plane with low-profile attachment shadows and a protected center logo region.

## Auction Table Reference

The live-auction inventory now follows the supplied table-first reference: a quiet pale-gray field, compact left-aligned heading, a short explanatory hierarchy, and a white centered table with generous row rhythm. Spot numbers appear as soft-gray square badges, size is encoded in a small letter chip, leading price and bid count form a dense right-aligned stack, and every action is a restrained blue outlined `Outbid` pill that preserves the existing modal bidding flow.
