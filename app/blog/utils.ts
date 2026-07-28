import fs from 'fs'
import path from 'path'
import type { Locale } from 'app/i18n/config'
import { defaultLocale } from 'app/i18n/config'
import { getDictionary } from 'app/i18n/dictionaries'

type Metadata = {
  title: string
  publishedAt: string
  summary: string
  image?: string
  /** When true, omit from listings, sitemap, and RSS (direct URL → 404). */
  hidden?: boolean
}

function parseFrontmatter(fileContent: string) {
  let frontmatterRegex = /---\s*([\s\S]*?)\s*---/
  let match = frontmatterRegex.exec(fileContent)
  let frontMatterBlock = match![1]
  let content = fileContent.replace(frontmatterRegex, '').trim()
  let frontMatterLines = frontMatterBlock.trim().split('\n')
  let metadata: Partial<Metadata> = {}

  frontMatterLines.forEach((line) => {
    let [key, ...valueArr] = line.split(': ')
    let rawKey = key.trim()
    let value = valueArr.join(': ').trim()
    value = value.replace(/^['"](.*)['"]$/, '$1') // Remove quotes
    if (rawKey === 'hidden') {
      metadata.hidden = value === 'true'
      return
    }
    metadata[rawKey as keyof Omit<Metadata, 'hidden'>] = value
  })

  return { metadata: metadata as Metadata, content }
}

function getMDXFiles(dir: string) {
  return fs.readdirSync(dir).filter((file) => path.extname(file) === '.mdx')
}

function readMDXFile(filePath: string) {
  let rawContent = fs.readFileSync(filePath, 'utf-8')
  return parseFrontmatter(rawContent)
}

function getMDXData(dir: string) {
  let mdxFiles = getMDXFiles(dir)
  return mdxFiles.map((file) => {
    let { metadata, content } = readMDXFile(path.join(dir, file))
    let slug = path.basename(file, path.extname(file))

    return {
      metadata,
      slug,
      content,
    }
  })
}

export function getBlogPosts(locale: Locale = defaultLocale) {
  return getMDXData(path.join(process.cwd(), 'app', 'blog', 'posts', locale)).filter(
    (post) => !post.metadata.hidden
  )
}

export function formatDate(
  date: string,
  locale: Locale = defaultLocale,
  includeRelative = false
) {
  let currentDate = new Date()
  if (!date.includes('T')) {
    date = `${date}T00:00:00`
  }
  let targetDate = new Date(date)

  let fullDate = targetDate.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  if (!includeRelative) {
    return fullDate
  }

  let t = getDictionary(locale).relative
  let yearsAgo = currentDate.getFullYear() - targetDate.getFullYear()
  let monthsAgo = currentDate.getMonth() - targetDate.getMonth()
  let daysAgo = currentDate.getDate() - targetDate.getDate()

  let formattedDate = ''

  if (yearsAgo > 0) {
    formattedDate = t.years(yearsAgo)
  } else if (monthsAgo > 0) {
    formattedDate = t.months(monthsAgo)
  } else if (daysAgo > 0) {
    formattedDate = t.days(daysAgo)
  } else {
    formattedDate = t.today
  }

  return `${fullDate} (${formattedDate})`
}
