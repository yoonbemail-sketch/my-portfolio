import { BlogPosts } from 'app/components/posts'

export default function Page() {
  return (
    <section>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">
        Lee
      </h1>
      <p className="mb-6 text-neutral-600 dark:text-neutral-400">
        Operations Analyst · Mathematical Optimization (OR) · PL-300 · LSSGB
      </p>
      <p className="mb-4 leading-relaxed text-neutral-800 dark:text-neutral-200">
        I work at the intersection of operations research and analytics:
        structuring messy operational data, modeling decisions, and shipping
        clear reporting that people can actually use. Certifications in Power BI
        (PL-300) and Lean Six Sigma Green Belt (LSSGB) shape how I approach
        measurement, process bottlenecks, and quality constraints.
      </p>
      <p className="mb-8 leading-relaxed text-neutral-800 dark:text-neutral-200">
        Selected projects below. Each write-up is a working outline—dashboard
        embeds, schema notes, and process constraints you can fill in as the
        work ships.
      </p>
      <h2 className="mb-4 text-lg font-medium tracking-tight">Projects</h2>
      <div className="my-4">
        <BlogPosts />
      </div>
    </section>
  )
}
