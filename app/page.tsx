import { BlogPosts } from 'app/components/posts'
import {
  Certifications,
  Education,
  Experience,
} from 'app/components/experience'
import { getDictionary } from 'app/i18n/dictionaries'
import { getLocale } from 'app/i18n/get-locale'

export default async function Page() {
  const locale = await getLocale()
  const t = getDictionary(locale)

  return (
    <section>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        Yoon Lee
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

      <section
        id="projects"
        aria-labelledby="projects-heading"
        className="mb-14"
      >
        <h2
          id="projects-heading"
          className="mb-6 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          {t.home.projectsHeading}
        </h2>
        <BlogPosts locale={locale} />
      </section>

      <section
        id="certifications"
        aria-labelledby="certifications-heading"
        className="mb-14"
      >
        <h2
          id="certifications-heading"
          className="mb-6 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          {t.home.certificationsHeading}
        </h2>
        <Certifications locale={locale} />
      </section>

      <section id="education" aria-labelledby="education-heading">
        <h2
          id="education-heading"
          className="mb-6 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          {t.home.educationHeading}
        </h2>
        <Education locale={locale} />
      </section>
    </section>
  )
}
