---
name: Yoon Lee
description: A short hiring memo on cool paper. Evidence before decoration.
colors:
  neutral-50: "#fafafa"
  neutral-100: "#f5f5f5"
  neutral-200: "#e5e5e5"
  neutral-300: "#d4d4d4"
  neutral-400: "#a3a3a3"
  neutral-500: "#737373"
  neutral-600: "#525252"
  neutral-700: "#404040"
  neutral-800: "#262626"
  neutral-900: "#171717"
  neutral-950: "#0a0a0a"
  code-keyword: "#e02518"
  code-string: "#007f7a"
  code-class: "#2d5e9d"
typography:
  display:
    fontFamily: "IBM Plex Sans KR, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: "2.25rem"
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "IBM Plex Sans KR, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "2rem"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "IBM Plex Sans KR, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: "1.75rem"
    letterSpacing: "-0.025em"
  body:
    fontFamily: "IBM Plex Sans KR, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.75rem"
  label:
    fontFamily: "IBM Plex Sans KR, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.5rem"
rounded:
  md: "0.375rem"
  lg: "0.5rem"
spacing:
  2: "0.5rem"
  4: "1rem"
  6: "1.5rem"
  8: "2rem"
  10: "2.5rem"
  12: "3rem"
  14: "3.5rem"
  16: "4rem"
components:
  text-button:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-600}"
    typography: "{typography.label}"
    rounded: "0"
    padding: "0.25rem 0.5rem"
  text-button-active:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-900}"
    typography: "{typography.label}"
    rounded: "0"
    padding: "0.25rem 0.5rem"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-600}"
    typography: "{typography.body}"
    rounded: "0"
    padding: "0.25rem 0.5rem"
  tab-selected:
    backgroundColor: "{colors.neutral-50}"
    textColor: "{colors.neutral-900}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  tab-idle:
    backgroundColor: "{colors.neutral-100}"
    textColor: "{colors.neutral-500}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
---

# Design System: Yoon Lee

## Overview

**Creative North Star: "The Briefing Note"**

A short hiring memo on cool paper. The page is quiet, precise, and restrained. Evidence comes before decoration. The reader is a hiring manager deciding whether Yoon Lee fits an operations analyst role, in English or Korean, and the interface should get out of the way of that decision.

The column is narrow, the type is IBM Plex Sans KR, and depth comes from hairlines and a shift in paper tone. There is no brand accent, no shadow, and no chrome competing with the name, the role, and the record. Code is the only place color appears, and it stays inside code.

**Key Characteristics:**

- One reading column, cool gray paper, carbon ink.
- IBM Plex Sans KR for the memo. IBM Plex Mono only for code.
- Flat. Borders and paper shifts carry state. Nothing lifts.
- Text first. Links and controls are words, not filled buttons.
- English and Korean share the same structure.

## Colors

The interface is a neutral paper-and-ink ramp. Light mode is Cool Paper with Carbon Ink. Dark mode swaps to Night Paper with the light end of the same ramp. Color is reserved for syntax highlighting inside code.

### Neutral

- **Cool Paper** (#fafafa): Page background in light mode, and the selected demo-tab face. Tailwind `neutral-50`.
- **Raised Paper** (#f5f5f5): Idle demo tabs, table headers, and dark-mode body text. Tailwind `neutral-100`.
- **Hairline** (#e5e5e5): Borders, rules, and dividers in light mode. Tailwind `neutral-200`.
- **Selection Gray** (#d4d4d4): Text selection in light mode. Tailwind `neutral-300`.
- **Quiet Gray** (#a3a3a3): Link underlines and the language slash. Tailwind `neutral-400`.
- **Caption** (#737373): Dates, captions, and copyright. Tailwind `neutral-500`.
- **Support Ink** (#525252): Nav, role line, summaries, and footer links. Tailwind `neutral-600`.
- **Dark Selection** (#404040): Text selection in dark mode. Tailwind `neutral-700`.
- **Body Ink** (#262626): Prose body in light mode, and dark-mode hairlines. Tailwind `neutral-800`.
- **Carbon Ink** (#171717): Name, headings, and selected controls in light mode. Tailwind `neutral-900`.
- **Night Paper** (#0a0a0a): Page background in dark mode. Tailwind `neutral-950`.

### Named Rules

**The Paper Rule.** The memo uses this neutral ramp only. Do not introduce a brand accent on the page. Red, teal, and blue belong to syntax highlighting inside `pre` and `code`.

## Typography

**Display Font:** IBM Plex Sans KR (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** IBM Plex Sans KR (with ui-sans-serif, system-ui, sans-serif)
**Label/Mono Font:** IBM Plex Mono (with ui-monospace, SFMono-Regular, Menlo, monospace), for code only

**Character:** One family carries the memo, from the name down to the footnotes. Weight and size do the hierarchy. Mono is an instrument for code, not a costume for the rest of the page.

### Hierarchy

- **Display** (600, 1.875rem / 2.25rem, tracking -0.025em): The name on the home page.
- **Headline** (600, 1.5rem / 2rem, tracking -0.025em): Home section headings.
- **Title** (500, 1.25rem / 1.75rem, tracking -0.025em): Case-study `h2`.
- **Body** (400, 1rem / 1.75rem): Home introduction. Case-study prose drops to 15px at the same line height.
- **Label** (500, 0.875rem / 1.25rem): Dates, captions, nav meta, and demo tabs.

### Named Rules

**The One Family Rule.** IBM Plex Sans KR is the voice of the memo. IBM Plex Mono appears only in code.

## Layout

A single column, `max-w-2xl` (42rem), inset by 1rem on small screens and centered from the `lg` breakpoint. The opening claim and the projects lead stay within 68ch. The page minimum width is 360px. Nav sits 2rem above the memo. The opening separates from the record by 3.5rem. Experience and projects, the evidence, separate by 4rem. Certifications, the supporting record, separate by 3rem. A heading sits 1rem above its group, closer than the gap that precedes it. Inside a record, related lines use 0.25–0.5rem and items in the same list use 1.5rem (experience, projects) or 1rem (certifications, education).

The elevator demo is the one breakout: it may widen to `min(100vw - 2rem, 72rem)`. Everything else stays in the column. Dates align on a 7.5rem rail from the `sm` breakpoint up and stack above the title when the column is narrow.

## Elevation & Depth

The memo is flat. There is no shadow vocabulary. Depth is a change of paper: Cool Paper for the page and the selected tab, Raised Paper for an idle tab, Hairline for a rule. Dark mode uses Night Paper, Body Ink rules, and Raised Paper text.

### Named Rules

**The Flat-By-Default Rule.** Surfaces stay flat at rest and on hover. State is weight, underline, or a paper shift. Do not add drop shadows.

## Shapes

Corners are square, except where a control is a folder tab or a code block. Demo tabs use a gentle top radius (0.375rem) so the selected tab meets the panel. Code blocks use a slightly larger radius (0.5rem). Rules are 1px hairlines. Links are underlines, offset, in Quiet Gray.

## Components

### Buttons

Text first. The only buttons are the language pair.

- **Shape:** Square (0 radius). No fill, no border, no shadow.
- **Primary:** There is no filled primary. The active language is Carbon Ink at label weight.
- **Hover / Focus:** The idle language darkens toward Body Ink. Do not invent a filled hover.
- **Secondary:** The idle language is Support Ink.

### Navigation

A single row of text links, Support Ink, with 0.25rem vertical and 0.5rem horizontal padding. Hover darkens the word. The language pair sits at the end of the same row, separated by a Quiet Gray slash. No bar, no pill, no active underline on the section links.

### Tabs

The Resume Aligner demo uses folder tabs.

- **Selected:** Cool Paper face, Carbon Ink, 1px Hairline, top radius 0.375rem, padding 0.5rem 0.75rem. The bottom border matches the panel so the tab opens into it.
- **Idle:** Raised Paper, Caption text, Hairline, same radius. Hover darkens the word only.

### Cards / Containers

The page does not use cards. A record is a stack of articles separated by space. Do not wrap a job, a project, or a certificate in a bordered card.

### Links

Prose links are underlined with a Quiet Gray decoration, 0.1em thick, offset by 2px. Footer links are Support Ink words with a 12px arrow, darkening to Carbon Ink on hover. Project titles underline on hover.

## Do's and Don'ts

### Do:

- **Do** keep the memo on Cool Paper (#fafafa) and Carbon Ink (#171717) in light mode, and Night Paper (#0a0a0a) in dark mode.
- **Do** set hierarchy with IBM Plex Sans KR size and weight: 1.875rem/600 for the name, 1.5rem/600 for section headings, 1rem/400 for the introduction.
- **Do** separate a major section by 3.5rem and keep related lines inside 0.5rem.
- **Do** show state with weight, underline, or a paper shift.

### Don't:

- **Don't** add a brand accent, gradient, or drop shadow to the memo.
- **Don't** use IBM Plex Mono outside code.
- **Don't** turn jobs, projects, or certificates into equal cards.
- **Don't** fill a button. Controls stay words.
