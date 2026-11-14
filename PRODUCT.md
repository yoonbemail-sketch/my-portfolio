# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Hiring managers and recruiters deciding whether Yoon Lee fits an operations analyst role. They may read the site in English or Korean.

## Product Purpose

A personal portfolio that lets that reader judge fit from work history, project proof, certifications, and education.

Success means a hiring reader can tell what Yoon does, which evidence supports it, and how to continue (email, LinkedIn) without leaving the site.

## Positioning

Operations analyst with a background in mathematical optimization (operations research), PL-300, and LSSGB. The published claim is structuring operational data, modeling decisions, and shipping reporting people use. Three named proof points: Elevator for OR-style decision experiments, Kream for ops data through Power BI reporting, and Resume Aligner for automation under human review.

## Operating Context

The public site is https://my-portfolio-omega-mocha-79.vercel.app/. Local development is `npm run dev` at http://localhost:3000. A reader switches language in the nav, scans the home page, and opens project case studies. Experience, education, and certifications live in `app/data/experience.ts` and are meant to stay aligned with LinkedIn and the resume hub.

## Capabilities and Constraints

- English and Korean must both remain.
- The home page currently has experience, projects, certifications, and education. The three projects are Kream sneakers resale analysis, the Elevator parking simulator, and semantic-resume-aligner. Keeping that section structure through a redesign was not locked.
- Current wording was not locked. Do not invent employers, metrics, credentials, testimonials, or project results that are not already on the site or in the resume sources.
- The site is a Next.js App Router app with React, MDX, and Tailwind CSS, deployed on Vercel.

## Brand Commitments

The name is Yoon Lee. The published voice is first person, professional, and specific. No visual identity was made binding.

## Evidence on Hand

- Home copy: `app/i18n/dictionaries.ts` (English and Korean)
- Experience, education, and certifications: `app/data/experience.ts`
- Case studies: `app/blog/posts/en/` and `app/blog/posts/ko/` for `kream-sneakers-resale-analysis`, `elevator-parking-simulator`, and `semantic-resume-aligner`
- Elevator demo: `public/elevator/`
- Resume Aligner demo slots point at MP4s under `public/demo/semantic-resume-aligner/`. Those video files are not in the repo, so do not treat the recordings as present.
- No testimonials, press quotes, or client logos.

## Product Principles

- The hiring reader is deciding fit. Lead with the role, the evidence, and a way to continue.
- English and Korean stay in step. A change to one language is incomplete until the other matches.
- Claims stay traceable to the published experience, projects, and credentials.
- The three projects are proof of the work, not decoration around a bio.
