# SlopeSense Website Design Directions

## Approach 1
**Theme Name:** Rainline Field Journal

**Very Brief Intro:** A warm, editorial disaster-preparedness interface that combines field-notebook textures, topographic marks, and calm operational panels. It makes complex sensing feel human, legible, and grounded in the barangay context.

**Probability:** 0.07

## Approach 2
**Theme Name:** Civic Signal Room

**Very Brief Intro:** A dark, high-contrast operations-room dashboard with restrained amber and signal-red accents. It emphasizes urgency, system status, and responder decision-making without becoming a cyberpunk interface.

**Probability:** 0.03

## Approach 3
**Theme Name:** Living Terrain Atlas

**Very Brief Intro:** A light, map-led visual system inspired by contemporary cartography, geological strata, and public-service wayfinding. It frames SlopeSense as a shared layer of knowledge between residents, sensors, and responders.

**Probability:** 0.09

## Chosen Approach: Living Terrain Atlas

### Design Movement
Contemporary cartographic modernism: public-service wayfinding, editorial information design, and geological field atlas references translated into a responsive monitoring product.

### Core Principles
1. **Terrain before decoration.** Every visual cue should suggest slope, contour, rainfall, or grounded place.
2. **Calm urgency.** Risk information must feel clear and actionable, never sensational or alarmist.
3. **Shared visibility.** Residents and responders should feel like they are reading the same living system from different perspectives.
4. **Operational clarity.** Status, thresholds, and next actions should be immediately scannable.

### Color Philosophy
Use a pale limestone background and deep charcoal ink as the stable base, with river-teal as the ownable SlopeSense signal color. Use moss for safe conditions, ochre for watch conditions, and rust-red only for active risk. The palette should feel like a Philippine field map after rain: natural, legible, and serious without defaulting to generic blue technology branding.

### Layout Paradigm
Use an asymmetric atlas layout: a wide editorial hero with a contour-line side rail, followed by a split monitoring canvas where the map/terrain panel anchors the left and sensor cards form a vertical reading sequence on the right. Avoid a centered marketing stack. Let the dashboard feel like a wall map translated into software.

### Signature Elements
- Fine contour-line patterns and elevation ticks used as quiet framing devices.
- A vertical “signal rail” that visually connects sensor readings to the current risk state.
- Map-pin / droplet / tilt glyphs rendered as simple line icons with filled state markers.

### Interaction Philosophy
Interactions should feel like checking a field instrument: deliberate, immediate, and informative. Hover and focus states reveal context, not spectacle. Changing a demo sensor filter should update the status narrative and highlight the affected signal rail. Actions should confirm what happened in plain language.

### Animation
Use short 160–240ms ease-out transitions for tabs, filters, and status changes. Allow contour lines to drift by only a few pixels on initial load, like a map being unfolded. Stagger sensor cards by 40ms on entrance. Use a restrained pulse only for an active alert dot, and respect reduced-motion preferences.

### Typography System
Use **DM Serif Display** for high-level titles and editorial section markers, paired with **Manrope** for interface copy, labels, values, and navigation. Headlines are compact and sentence-cased; data values use bold Manrope with generous tracking; eyebrow labels use uppercase Manrope at 0.14em letter spacing.

### Brand Essence
SlopeSense is a community-centered landslide early-warning prototype for residents and disaster responders who need understandable signals before conditions become dangerous.

Personality: **grounded, vigilant, neighborly**.

### Brand Voice
Headlines speak with quiet confidence. CTAs name the next useful action instead of using generic conversion language. Microcopy explains what the system knows, what it does not know yet, and what the user can do next.

Example lines:
- “Read the slope before it moves.”
- “A watch signal is a reason to prepare, not a reason to panic.”

### Wordmark & Logo
Use a compact symbol combining a sloped contour wedge with a small sensing dot, suggesting both terrain and a live IoT node. The wordmark should be set in a custom-feeling lockup: “Slope” in DM Serif Display and “Sense” in Manrope semibold, with the contour wedge acting as the crossbar accent between the two words.

### Signature Brand Color
**SlopeSense River Teal — #0F766E.** It represents the meeting point of rainfall, terrain, and usable public information; it is distinct from generic emergency red and generic technology blue.

## Style Decisions

- Every primary dashboard screen should include an atlas-style monitoring composition with a terrain/map or contour field anchor, a visible signal rail, and sensor readings arranged as a connected sequence.
- Use DM Serif Display for editorial titles and Manrope for labels, values, tables, and navigation; avoid a single generic sans-serif voice.
- Action labels should name the useful monitoring outcome, such as “Check affected sensors,” “Read the current slope signal,” or “Prepare for a watch state,” instead of generic dashboard CTAs.
- Keep the provided BDRRMC reference’s practical density, persistent sidebar, compact status cards, and red/amber/blue/green severity vocabulary while layering in stronger cartographic framing.
