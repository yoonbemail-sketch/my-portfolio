import { BlogPosts } from 'app/components/posts'

export const metadata = {
  title: 'Projects',
  description: 'Selected analytics and systems projects.',
}

export default function Page() {
  return (
    <section>
      <h1 className="font-semibold text-2xl mb-2 tracking-tight">Projects</h1>
      <p className="mb-8 text-neutral-600 dark:text-neutral-400 leading-relaxed">
        Case write-ups with room for dashboards, schemas, and process notes.
      </p>
      <BlogPosts />
    </section>
  )
}
