export const locales = ['ko', 'en'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'
export const localeCookieName = 'portfolio-locale'

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'ko' || value === 'en'
}
