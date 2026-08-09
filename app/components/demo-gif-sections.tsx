'use client'

import { useEffect, useState } from 'react'

export type DemoGifTab = {
  label: string
  src: string
  caption: string
}

type DemoGifSectionsProps = {
  analyzeTitle?: string
  autofillTitle?: string
  analyzeTabs: DemoGifTab[]
  autofillTabs: DemoGifTab[]
  placeholderHint?: string
}

function GifSlot({
  tab,
  placeholderHint,
}: {
  tab: DemoGifTab
  placeholderHint: string
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [tab.src])

  const showImage = Boolean(tab.src) && !failed

  return (
    <figure className="w-full">
      <div className="w-full overflow-hidden border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
        {showImage ? (
          <img
            key={tab.src}
            src={tab.src}
            alt={tab.label}
            className="block w-full object-cover"
            style={{ aspectRatio: '16 / 9', minHeight: '320px' }}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-neutral-500 dark:text-neutral-400"
            style={{ aspectRatio: '16 / 9', minHeight: '320px' }}
          >
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {tab.label}
            </span>
            <span>{placeholderHint}</span>
            {tab.src ? (
              <span className="font-mono text-xs text-neutral-400 dark:text-neutral-500">
                {tab.src}
              </span>
            ) : null}
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {tab.caption}
      </figcaption>
    </figure>
  )
}

function TabbedGifSection({
  title,
  tabs,
  placeholderHint,
}: {
  title: string
  tabs: DemoGifTab[]
  placeholderHint: string
}) {
  const [active, setActive] = useState(0)
  const safeIndex = Math.min(active, Math.max(tabs.length - 1, 0))
  const current = tabs[safeIndex]

  if (!tabs.length || !current) return null

  return (
    <section className="my-10 w-full">
      <h3 className="mb-3 text-base font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
        {title}
      </h3>
      <div
        role="tablist"
        aria-label={title}
        className="flex flex-wrap gap-x-5 gap-y-2 border-b border-neutral-200 dark:border-neutral-800"
      >
        {tabs.map((tab, index) => {
          const selected = index === safeIndex
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`${title}-tab-${index}`}
              className={
                selected
                  ? 'relative -mb-px border-b-2 border-neutral-900 pb-2 text-sm font-medium text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
                  : 'pb-2 text-sm text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
              }
              onClick={() => setActive(index)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div
        role="tabpanel"
        aria-labelledby={`${title}-tab-${safeIndex}`}
        className="mt-4"
      >
        <GifSlot tab={current} placeholderHint={placeholderHint} />
      </div>
    </section>
  )
}

export function DemoGifSections({
  analyzeTitle = 'Analyze',
  autofillTitle = 'Autofill',
  analyzeTabs,
  autofillTabs,
  placeholderHint = 'GIF coming soon — drop the recording into public/.',
}: DemoGifSectionsProps) {
  return (
    <div className="not-prose w-full">
      <TabbedGifSection
        title={analyzeTitle}
        tabs={analyzeTabs}
        placeholderHint={placeholderHint}
      />
      <TabbedGifSection
        title={autofillTitle}
        tabs={autofillTabs}
        placeholderHint={placeholderHint}
      />
    </div>
  )
}
