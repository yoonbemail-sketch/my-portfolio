import { BlogPosts } from 'app/components/posts'
import { getDictionary } from 'app/i18n/dictionaries'
import { getLocale } from 'app/i18n/get-locale'

export async function generateMetadata() {
  const locale = await getLocale()
  const t = getDictionary(locale)
  return {
    title: t.projects.title,
    description: t.projects.description,
  }
}

export default async function Page() {
  const locale = await getLocale()
  const t = getDictionary(locale)

  return (
    <section>
      <h1 className="font-semibold text-2xl mb-2 tracking-tight">
        {t.projects.title}
      </h1>
      <p className="mb-8 text-neutral-600 dark:text-neutral-400 leading-relaxed">
        {t.projects.description}
      </p>
      <BlogPosts locale={locale} />
    </section>
  )
}
