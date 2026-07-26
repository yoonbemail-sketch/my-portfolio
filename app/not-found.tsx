import { getDictionary } from 'app/i18n/dictionaries'
import { getLocale } from 'app/i18n/get-locale'

export default async function NotFound() {
  const locale = await getLocale()
  const t = getDictionary(locale)

  return (
    <section>
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">
        {t.notFound.title}
      </h1>
      <p className="mb-4">{t.notFound.body}</p>
    </section>
  )
}
