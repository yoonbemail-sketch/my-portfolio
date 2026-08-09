'use client'

import { useEffect, useState } from 'react'

export type DemoGifTab = {
  label: string
  src: string
  caption: string
}

type Locale = 'en' | 'ko'

const DEMO_BASE = '/demo/semantic-resume-aligner'

const COPY: Record<
  Locale,
  {
    analyzeTitle: string
    autofillTitle: string
    placeholderHint: string
    analyzeTabs: DemoGifTab[]
    autofillTabs: DemoGifTab[]
  }
> = {
  en: {
    analyzeTitle: 'Analyze',
    autofillTitle: 'Autofill',
    placeholderHint: 'GIF coming soon — drop the recording into public/.',
    analyzeTabs: [
      {
        label: 'APPLY',
        src: `${DEMO_BASE}/analyze-apply.gif`,
        caption: 'Clear APPLY with a recommended resume version.',
      },
      {
        label: 'APPLY WITH CAUTION',
        src: `${DEMO_BASE}/analyze-caution.gif`,
        caption: 'Worth applying, with preferred gaps still visible.',
      },
      {
        label: 'NEEDS REVIEW',
        src: `${DEMO_BASE}/analyze-needs-review.gif`,
        caption: 'Mandatory fact unknown — resolve Yes/No in the hub, then re-analyze.',
      },
      {
        label: 'DO NOT APPLY',
        src: `${DEMO_BASE}/analyze-do-not-apply.gif`,
        caption: 'Hard stop — no resume push when applyability fails.',
      },
    ],
    autofillTabs: [
      {
        label: 'Work & education',
        src: `${DEMO_BASE}/autofill-experience.gif`,
        caption:
          'Experience and education from the hub (Phenom also fills short Role description).',
      },
      {
        label: 'Profile basics',
        src: `${DEMO_BASE}/autofill-profile.gif`,
        caption: 'Contact and work-authorization answers; availability left blank.',
      },
      {
        label: 'Voluntary info',
        src: `${DEMO_BASE}/autofill-voluntary.gif`,
        caption:
          'Sex, gender identity, ethnicity, and acknowledgment — Submit stays manual.',
      },
    ],
  },
  ko: {
    analyzeTitle: '분석',
    autofillTitle: '자동 입력',
    placeholderHint: 'GIF 준비 중 — public/에 녹화본을 넣으세요.',
    analyzeTabs: [
      {
        label: '지원',
        src: `${DEMO_BASE}/analyze-apply.gif`,
        caption: 'APPLY와 추천 resume 버전이 바로 보이는 결과.',
      },
      {
        label: '주의하며 지원',
        src: `${DEMO_BASE}/analyze-caution.gif`,
        caption: '지원 가치는 있으나 preferred gap이 남는 경우.',
      },
      {
        label: '검토 필요',
        src: `${DEMO_BASE}/analyze-needs-review.gif`,
        caption: '필수 사실이 불명 — hub에서 Yes/No 후 다시 분석.',
      },
      {
        label: '지원하지 않음',
        src: `${DEMO_BASE}/analyze-do-not-apply.gif`,
        caption: 'Applyability 실패 시 resume 추천 없이 멈춤.',
      },
    ],
    autofillTabs: [
      {
        label: '경력·학력',
        src: `${DEMO_BASE}/autofill-experience.gif`,
        caption:
          '경력·학력을 hub에서 채움 (Phenom은 짧은 Role description도 채움).',
      },
      {
        label: '기본 정보',
        src: `${DEMO_BASE}/autofill-profile.gif`,
        caption: '연락처·근무 허가 답변을 채우고 입사 가능일은 비워 둠.',
      },
      {
        label: '자발적 정보',
        src: `${DEMO_BASE}/autofill-voluntary.gif`,
        caption: '성별·Gender Identity·ethnicity·동의 체크 — 제출은 수동.',
      },
    ],
  },
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
  const list = Array.isArray(tabs) ? tabs : []
  const safeIndex = Math.min(active, Math.max(list.length - 1, 0))
  const current = list[safeIndex]

  if (!list.length || !current) return null

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
        {list.map((tab, index) => {
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

export function DemoGifSections({ locale = 'en' }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en

  return (
    <div className="not-prose w-full">
      <TabbedGifSection
        title={copy.analyzeTitle}
        tabs={copy.analyzeTabs}
        placeholderHint={copy.placeholderHint}
      />
      <TabbedGifSection
        title={copy.autofillTitle}
        tabs={copy.autofillTabs}
        placeholderHint={copy.placeholderHint}
      />
    </div>
  )
}
