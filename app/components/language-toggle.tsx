'use client'

import { useRouter } from 'next/navigation'
import { localeCookieName, type Locale } from 'app/i18n/config'

export function LanguageToggle({
  locale,
  label,
}: {
  locale: Locale
  label: string
}) {
  const router = useRouter()

  function setLocale(next: Locale) {
    if (next === locale) return
    document.cookie = `${localeCookieName}=${next};path=/;max-age=31536000;samesite=lax`
    document.documentElement.lang = next
    router.refresh()
  }

  return (
    <div
      className="flex items-center gap-1 py-1 px-2 m-1 text-sm text-neutral-600 dark:text-neutral-400"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={
          locale === 'en'
            ? 'font-medium text-neutral-900 dark:text-neutral-100'
            : 'hover:text-neutral-800 dark:hover:text-neutral-200'
        }
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
      <span className="text-neutral-400 dark:text-neutral-600" aria-hidden="true">
        /
      </span>
      <button
        type="button"
        onClick={() => setLocale('ko')}
        className={
          locale === 'ko'
            ? 'font-medium text-neutral-900 dark:text-neutral-100'
            : 'hover:text-neutral-800 dark:hover:text-neutral-200'
        }
        aria-pressed={locale === 'ko'}
      >
        KO
      </button>
    </div>
  )
}
