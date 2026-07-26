import Link from 'next/link'
import { LanguageToggle } from './language-toggle'
import { getDictionary } from 'app/i18n/dictionaries'
import type { Locale } from 'app/i18n/config'

export function Navbar({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)
  const navItems = [
    { href: '/', name: t.nav.home },
    { href: '/#experience', name: t.nav.experience },
    { href: '/#projects', name: t.nav.projects },
  ]

  return (
    <aside className="-ml-[8px] mb-12 tracking-tight">
      <div className="lg:sticky lg:top-20">
        <nav
          className="flex flex-row items-center justify-between relative px-0 pb-0 md:overflow-auto scroll-pr-6 md:relative"
          id="nav"
          aria-label="Primary"
        >
          <div className="flex flex-row space-x-0 pr-4">
            {navItems.map(({ href, name }) => {
              return (
                <Link
                  key={href}
                  href={href}
                  className="hover:text-neutral-800 dark:hover:text-neutral-200 flex align-middle relative py-1 px-2 m-1 text-neutral-600 dark:text-neutral-400"
                >
                  {name}
                </Link>
              )
            })}
          </div>
          <LanguageToggle locale={locale} label={t.nav.language} />
        </nav>
      </div>
    </aside>
  )
}
