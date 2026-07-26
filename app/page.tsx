import { BlogPosts } from 'app/components/posts'
import { Experience } from 'app/components/experience'
import { getDictionary } from 'app/i18n/dictionaries'
import { getLocale } from 'app/i18n/get-locale'

export default async function Page() {
  const locale = await getLocale()
  const t = getDictionary(locale)

  return (
    <section>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        Lee
      </h1>
      <p className="mb-6 text-neutral-600 dark:text-neutral-400">{t.home.role}</p>
      <p className="mb-4 leading-7 text-neutral-800 dark:text-neutral-200">
        {t.home.intro}
      </p>
      <p className="mb-10 leading-7 text-neutral-800 dark:text-neutral-200">
        {t.home.projectsLead}
      </p>

      <section
        id="experience"
        aria-labelledby="experience-heading"
        className="mb-14"
      >
        <h2
          id="experience-heading"
          className="mb-6 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          {t.home.experienceHeading}
        </h2>
        <Experience locale={locale} />
      </section>

      <section id="projects" aria-labelledby="projects-heading">
        <h2
          id="projects-heading"
          className="mb-6 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          {t.home.projectsHeading}
        </h2>
        <BlogPosts locale={locale} />
      </section>
    </section>
  )
}
