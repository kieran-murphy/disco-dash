# Disco Dash — Goals

## North star

Disco Dash is an **idle tycoon**: you grow a nightclub from a near-empty room
into a packed, thumping venue. Money and VIP points aren't just counters —
they're currency that funds the club's growth.

## Current state (as of 2026-08-29)

- Dancers wander an isometric floor and arrive one at a time up to a cap
  (`MAX_CUSTOMERS` in [src/components/ClubGameInner.jsx](src/components/ClubGameInner.jsx)).
- Money trickles in per customer per tick; VIP points drop on a random timer.
- [StatsHud.jsx](src/components/StatsHud.jsx) displays running totals.
- Gaps: money/VIP points have no sink (nothing to spend them on), no player
  interaction exists, and nothing persists across a page refresh.

## Milestone: close the economy loop

1. **Give money a sink** — a shop/upgrade panel (new component, or expand
   StatsHud) where accumulated cash gets spent.
2. **Upgrade categories** (map to existing knobs in ClubGameInner.jsx):
   - **Capacity** — raise `MAX_CUSTOMERS` past 9 (more dancer slots/sprites)
   - **Income rate** — raise `MONEY_PER_CUSTOMER_PER_TICK`
   - **Arrival speed** — shrink `CUSTOMER_ARRIVAL_MIN/MAX_MS` so the floor
     fills faster
   - **VIP-gated extras** — spend VIP points (rarer currency) on something
     distinct from money. See **VIP mode** milestone below for the concrete
     first version of this.
3. **Scaling costs** — each purchase gets pricier (standard idle-game cost
   curve) so the loop has a real curve to it instead of one-and-done.
4. **Persistence** — everything currently resets on refresh, which undercuts
   the idle-game hook of coming back later to a club that grew without you.
   Fold into this milestone via `localStorage`, or split off separately —
   still open.

## Milestone: VIP mode

Spending VIP points buys a temporary "VIP mode" burst — multipliers spike and
the dance floor's tile grid shifts into a colourful/rainbow palette for the
duration.

- **Trigger & cost** — buy a VIP with VIP points. First purchase costs 3 VIP
  points; each subsequent purchase costs 1.5x the previous (rounded), same
  scaling-cost idea as the economy-loop upgrades above.
- **Duration** — 60-second timed burst, not a persistent toggle. The buy
  button is locked out while one is already active — no re-buying to extend
  or stack a burst.
- **Effect while active**:
  - Money income rate (`MONEY_PER_CUSTOMER_PER_TICK`) gets multiplied by 3x
  - Customer arrival speed gets multiplied by 2x (dancers arrive faster,
    packing the floor for the duration)
- **Visuals while active** — floor tiles only for now: the existing
  diamond-grid glow/twinkle shifts into a rainbow/party palette. Dancers and
  walls stay as-is (could extend to them later).

### VIP sprite

The VIP isn't a new character — it's one of the existing (arrived) dancers,
picked at random when VIP mode triggers, visually marked as the VIP for the
burst's duration:

- **Selection** — random pick among currently-arrived dancers (same pattern
  already used for the money/VIP popup target).
- **Aura/glow** — reuse the `shadowColor`/`shadowBlur` technique the diamond
  floor tiles already use for their twinkle glow, applied to the chosen
  dancer's sprite instead.
- **Tag above head** — small icon/text (e.g. a crown or "VIP" badge) floating
  above the dancer's position, following the same floating-badge approach
  already used for the money/VIP gain popups.

**Implementation note**: the 9 dancers are currently rendered as 9
near-identical hardcoded JSX blocks rather than a mapped array. Decided:
refactor the dancer rendering into a data-driven list before building the
VIP glow/tag — more work up front, but pays off here and for any future
`MAX_CUSTOMERS` capacity upgrades too.

## Open questions

- Do upgrade categories above match the intended shape, or are there others
  to add/drop?
- Is persistence in-scope for the economy-loop milestone, or a separate one?

## Later (not yet scoped)

- Player interaction (currently everything runs on its own — no clicks)
- Progression/win state — levels, unlocks, milestones
- Polish & juice — more sprites/animations/sound/lighting
