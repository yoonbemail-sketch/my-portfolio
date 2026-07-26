import './global.css'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Navbar } from './components/nav'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Footer from './components/footer'
import { baseUrl } from './sitemap'
import { getLocale } from './i18n/get-locale'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Yoon Lee · Operations Analyst',
    template: '%s · Yoon Lee',
  },
  description:
    'Portfolio of an Operations Analyst specializing in mathematical optimization, Power BI, and process improvement.',
  openGraph: {
    title: 'Yoon Lee · Operations Analyst',
    description:
      'Projects in analytics, automation pipelines, and backend data design.',
    url: baseUrl,
    siteName: 'Yoon Lee · Portfolio',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()

  return (
    <html
      lang={locale}
      className={cx(
        'text-neutral-900 bg-neutral-50 dark:text-neutral-100 dark:bg-neutral-950',
        GeistSans.variable,
        GeistMono.variable
      )}
    >
      <body className="antialiased max-w-2xl mx-4 mt-8 lg:mx-auto">
        <main className="flex-auto min-w-0 mt-6 flex flex-col px-2 md:px-0">
          <Navbar locale={locale} />
          {children}
          <Footer locale={locale} />
          <Analytics />
          <SpeedInsights />
        </main>
      </body>
    </html>
  )
}
