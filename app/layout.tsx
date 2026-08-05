import './global.css'
import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans_KR } from 'next/font/google'
import { Navbar } from './components/nav'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Footer from './components/footer'
import { baseUrl } from './sitemap'
import { getLocale } from './i18n/get-locale'

const ibmPlexSansKr = IBM_Plex_Sans_KR({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-kr',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

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
        ibmPlexSansKr.variable,
        ibmPlexMono.variable
      )}
    >
      <body
        className={cx(
          ibmPlexSansKr.className,
          'antialiased max-w-2xl mx-4 mt-8 lg:mx-auto'
        )}
      >
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
