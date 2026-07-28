import {
  getCertifications,
  getEducation,
  getExperience,
} from 'app/data/experience'
import { getDictionary } from 'app/i18n/dictionaries'
import type { Locale } from 'app/i18n/config'

export function Experience({ locale }: { locale: Locale }) {
  const experience = getExperience(locale)

  return (
    <div className="flex flex-col gap-6">
      {experience.map((item) => (
        <article key={item.id} className="flex flex-col gap-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
            <time className="shrink-0 text-sm tabular-nums text-neutral-500 dark:text-neutral-500 sm:w-[7.5rem]">
              {item.dateLabel}
            </time>
            <h3 className="text-base font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
              {item.title}
              <span className="font-normal text-neutral-600 dark:text-neutral-400">
                {' '}
                · {item.employer}
              </span>
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:pl-[calc(7.5rem+0.75rem)]">
            {item.summary}
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:ml-[calc(7.5rem+0.75rem)] sm:pl-5">
            {item.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}

export function Certifications({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)
  const certifications = getCertifications(locale)

  return (
    <div className="flex flex-col gap-4">
      {certifications.map((item) => (
        <article key={item.id} className="flex flex-col gap-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
            <time className="shrink-0 text-sm tabular-nums text-neutral-500 dark:text-neutral-500 sm:w-[7.5rem]">
              {item.dateLabel}
            </time>
            <h3 className="text-base font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline hover:underline-offset-4"
              >
                {item.name}
              </a>
              <span className="font-normal text-neutral-600 dark:text-neutral-400">
                {' '}
                · {item.issuer}
              </span>
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:pl-[calc(7.5rem+0.75rem)]">
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              {t.home.certificatePdf}
            </a>
          </p>
        </article>
      ))}
    </div>
  )
}

export function Education({ locale }: { locale: Locale }) {
  const education = getEducation(locale)

  return (
    <div className="flex flex-col gap-4">
      {education.map((item) => (
        <article key={item.id} className="flex flex-col gap-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
            <time className="shrink-0 text-sm tabular-nums text-neutral-500 dark:text-neutral-500 sm:w-[7.5rem]">
              {item.dateLabel}
            </time>
            <h3 className="text-base font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
              {item.degree}
              <span className="font-normal text-neutral-600 dark:text-neutral-400">
                {' '}
                · {item.school}
              </span>
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:pl-[calc(7.5rem+0.75rem)]">
            {item.detail}
          </p>
        </article>
      ))}
    </div>
  )
}
