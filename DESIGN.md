# Souffleur design system

This documents the existing visual identity refined in 4.8.0, not a new brand. The user chose to keep the dark Dracula-inspired palette and purple accent. Both the library and Spotlight are **Operate** surfaces: search, copy and editing take priority over decoration.

## Foundations

`src/theme.css` is the source of truth, imported by the library stylesheet and bundled into Spotlight’s shadow root.

| Token | Value | Role |
| --- | --- | --- |
| `--background` | `#282a36` | Main canvas, editor, modal |
| `--surface` | `#303341` | Search field, help/error surfaces |
| `--selection` | `#44475a` | Selected result, separators, feedback |
| `--foreground` | `#f8f8f2` | Primary text |
| `--muted` | `#b4b9cf` | Preview, help, placeholders |
| `--border` | `#767e9a` | Form/control boundaries |
| `--purple` | `#bd93f9` | Primary action, focus, brand cue |
| `--cyan` | `#8be9fd` | Prompt titles / selected title |
| `--red` | `#ff9393` | Errors and destructive menu action |
| `--green` | `#8be6a7` | Reserved success semantic token |

A system font stack avoids network requests and feels native on each desktop. Base size 16px; prompt titles 16px, descriptions and controls 14px, secondary help 12px. Headlines remain modest. Never use uppercase micro-labels or multiple bright action colors for visual hierarchy.

## Library

A compact left-aligned header exposes the actual Spotlight shortcut. One **New prompt** button leads the toolbar. Search covers the full library; the caption distinguishes total count from filtered count. Prompts are separated rows with a title, two-line text preview, Copy, Edit, and a secondary More disclosure. Reorder and delete live under More. Dragging the title is an optional pointer shortcut; keyboard move actions remain available.

One labeled inline editor handles both create/edit. Save and Cancel stay explicit; Ctrl/⌘ + Enter saves, Esc cancels. A failed save retains the draft with an adjacent message. External changes refresh the library but not an open draft. The editor checks conflicts against its original prompt.

Import asks how the file should affect the library, defaulting to additive merge. Only replacement requires a protected modal decision, and it creates a recovery copy. Empty and error states give an action. Success/error feedback is readable and dismissible; deletion offers Undo without a countdown.

## Spotlight

A single 640px maximum-width native dialog floats above the current page, with a restrained dark backdrop and soft downward shadow. No full-page blur work. The search field is the visual and keyboard starting point. The first match is selected. Results show a title and one-line preview; a quiet footer teaches arrows, Enter and Esc. Focus is contained while open and restored to the previous field on close. Failed copy stays open.

Keep viewport-relative maximum height and scroll only the result list, preserving the input and footer. Empty library, no matches, loading, failed loading with Retry, and failed copying are distinct states. Results beyond the first 100 remain reachable by keyboard or Show more.

## Interaction and accessibility

- Native controls, labels, semantic lists, dialog/combobox/listbox roles, live status and error regions.
- Purple visible focus outlines and a focused search-row underline. Selection has both a background and `aria-selected`.
- Controls target desktop pointer/keyboard use; library buttons are generally 40px high and search 44px. Compact Spotlight close controls are 32px, above the WCAG 2.2 24px minimum; this is not a mobile-first extension.
- Long words wrap in titles, previews truncate, prompt inputs support automatic text direction. Layout wraps at narrow widths and with 200% text expansion.
- Only Spotlight’s short upward settling motion is authored; reduced-motion users receive the stable final state. No row lifts or smooth-scroll delays during keyboard search.
- Forced-colors mode keeps native boundaries/selection visible. There is one deliberate dark theme; adding light mode requires a complete token mapping for both surfaces.

Use the browser fixtures and axe tests to verify changes. Tests supplement visual/keyboard inspection and do not replace screen-reader testing.
