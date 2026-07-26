import { notFound } from 'next/navigation'
import { CustomMDX } from 'app/components/mdx'
import { formatDate, getBlogPosts } from 'app/blog/utils'
import { baseUrl } from 'app/sitemap'
import { getLocale } from 'app/i18n/get-locale'
import { locales } from 'app/i18n/config'

export async function generateStaticParams() {
  let posts = getBlogPosts('en')

  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>
}) {
  let params = await props.params
  let locale = await getLocale()
  let post =
    getBlogPosts(locale).find((post) => post.slug === params.slug) ??
    locales
      .map((l) => getBlogPosts(l).find((p) => p.slug === params.slug))
      .find((p) => p !== undefined)
  if (!post) {
    return
  }

  let {
    title,
    publishedAt: publishedTime,
    summary: description,
    image,
  } = post.metadata
  let ogImage = image
    ? image
    : `${baseUrl}/og?title=${encodeURIComponent(title)}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime,
      url: `${baseUrl}/blog/${post.slug}`,
      images: [
        {
          url: ogImage,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function Blog(props: {
  params: Promise<{ slug: string }>
}) {
  let params = await props.params
  let locale = await getLocale()
  let post = getBlogPosts(locale).find((post) => post.slug === params.slug)

  if (!post) {
    notFound()
  }

  return (
    <section>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.metadata.title,
            datePublished: post.metadata.publishedAt,
            dateModified: post.metadata.publishedAt,
            description: post.metadata.summary,
            image: post.metadata.image
              ? `${baseUrl}${post.metadata.image}`
              : `/og?title=${encodeURIComponent(post.metadata.title)}`,
            url: `${baseUrl}/blog/${post.slug}`,
            inLanguage: locale === 'ko' ? 'ko-KR' : 'en-US',
            author: {
              '@type': 'Person',
              name: 'Yoon Lee',
            },
          }),
        }}
      />
      <h1 className="title font-semibold text-2xl tracking-tight leading-snug">
        {post.metadata.title}
      </h1>
      <div className="flex justify-between items-center mt-2 mb-8 text-sm">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatDate(post.metadata.publishedAt, locale, true)}
        </p>
      </div>
      <article className="prose">
        <CustomMDX source={post.content} />
      </article>
    </section>
  )
}
