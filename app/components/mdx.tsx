import Link from 'next/link'
import Image from 'next/image'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { highlight } from 'sugar-high'
import React from 'react'

function Table({ data }) {
  let headers = data.headers.map((header, index) => (
    <th key={index}>{header}</th>
  ))
  let rows = data.rows.map((row, index) => (
    <tr key={index}>
      {row.map((cell, cellIndex) => (
        <td key={cellIndex}>{cell}</td>
      ))}
    </tr>
  ))

  return (
    <div className="my-5 w-full overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="m-0 w-full border-collapse text-[0.9em]">
        <thead>
          <tr>{headers}</tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  )
}

function CustomLink(props) {
  let href = props.href

  if (href.startsWith('/')) {
    return (
      <Link href={href} {...props}>
        {props.children}
      </Link>
    )
  }

  if (href.startsWith('#')) {
    return <a {...props} />
  }

  return <a target="_blank" rel="noopener noreferrer" {...props} />
}

function RoundedImage(props) {
  return <Image alt={props.alt} className="rounded-lg" {...props} />
}

function PowerBIEmbed({
  src,
  title = 'Power BI dashboard',
}: {
  src: string
  title?: string
}) {
  return (
    <figure className="my-8 w-full">
      <div className="w-full overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
        <iframe
          src={src}
          title={title}
          className="w-full border-0"
          style={{ aspectRatio: '16 / 9', minHeight: '360px' }}
          allowFullScreen
          loading="lazy"
        />
      </div>
      <figcaption className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {title}
      </figcaption>
    </figure>
  )
}

function toEmbedSrc(src: string): string | null {
  if (!src || src.includes('REPLACE_WITH')) return null

  try {
    const url = new URL(src)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = url.searchParams.get('v') || url.pathname.split('/').pop()
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    if (host === 'loom.com' || host === 'www.loom.com') {
      const match = url.pathname.match(/\/(?:share|embed)\/([a-zA-Z0-9]+)/)
      return match ? `https://www.loom.com/embed/${match[1]}` : null
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = url.pathname.split('/').filter(Boolean).pop()
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch {
    // Local /public paths fall through to the <video> branch.
  }

  return null
}

function VideoEmbed({
  src,
  title = 'Demo video',
}: {
  src: string
  title?: string
}) {
  const embedSrc = toEmbedSrc(src)
  const isFile =
    /\.(mp4|webm|ogg)(\?|$)/i.test(src) || src.startsWith('/')

  return (
    <figure className="my-8 w-full">
      <div className="w-full overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
        {embedSrc ? (
          <iframe
            src={embedSrc}
            title={title}
            className="w-full border-0"
            style={{ aspectRatio: '16 / 9', minHeight: '360px' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : isFile && !src.includes('REPLACE_WITH') ? (
          <video
            src={src}
            title={title}
            controls
            playsInline
            className="w-full"
            style={{ aspectRatio: '16 / 9', minHeight: '360px' }}
          />
        ) : (
          <div
            className="flex items-center justify-center px-6 text-center text-sm text-neutral-500 dark:text-neutral-400"
            style={{ aspectRatio: '16 / 9', minHeight: '360px' }}
          >
            Demo video coming soon — paste a YouTube, Loom, or Vimeo URL.
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {title}
      </figcaption>
    </figure>
  )
}

function Code({ children, ...props }) {
  let codeHTML = highlight(children)
  return <code dangerouslySetInnerHTML={{ __html: codeHTML }} {...props} />
}

function slugify(str) {
  return str
    .toString()
    .toLowerCase()
    .trim() // Remove whitespace from both ends of a string
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word characters except for -
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
}

function createHeading(level) {
  const Heading = ({ children }) => {
    let slug = slugify(children)
    return React.createElement(
      `h${level}`,
      { id: slug },
      [
        React.createElement('a', {
          href: `#${slug}`,
          key: `link-${slug}`,
          className: 'anchor',
        }),
      ],
      children
    )
  }

  Heading.displayName = `Heading${level}`

  return Heading
}

let components = {
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  h5: createHeading(5),
  h6: createHeading(6),
  Image: RoundedImage,
  PowerBIEmbed,
  VideoEmbed,
  a: CustomLink,
  code: Code,
  Table,
}

export function CustomMDX(props) {
  return (
    <MDXRemote
      {...props}
      components={{ ...components, ...(props.components || {}) }}
    />
  )
}
