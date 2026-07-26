import Link from 'next/link'
import { formatDate, getBlogPosts } from 'app/blog/utils'

export function BlogPosts() {
  let allBlogs = getBlogPosts()

  return (
    <div className="flex flex-col gap-6">
      {allBlogs
        .sort((a, b) => {
          if (
            new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)
          ) {
            return -1
          }
          return 1
        })
        .map((post) => (
          <Link
            key={post.slug}
            className="group block"
            href={`/blog/${post.slug}`}
          >
            <div className="flex flex-col gap-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                <time className="shrink-0 text-sm tabular-nums text-neutral-500 dark:text-neutral-500">
                  {formatDate(post.metadata.publishedAt, false)}
                </time>
                <h3 className="text-base font-medium tracking-tight text-neutral-900 group-hover:underline group-hover:underline-offset-4 dark:text-neutral-100">
                  {post.metadata.title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:pl-[calc(100px+0.75rem)]">
                {post.metadata.summary}
              </p>
            </div>
          </Link>
        ))}
    </div>
  )
}
