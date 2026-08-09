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
    placeholderHint: 'Recording pending. Add the GIF under public/.',
    analyzeTabs: [
      {
        label: 'APPLY',
        src: `${DEMO_BASE}/analyze-apply.gif`,
        caption: 'APPLY recommendation with a selected resume version.',
      },
      {
        label: 'APPLY WITH CAUTION',
        src: `${DEMO_BASE}/analyze-caution.gif`,
        caption: 'Application remains viable; preferred-requirement gaps are listed.',
      },
      {
        label: 'NEEDS REVIEW',
        src: `${DEMO_BASE}/analyze-needs-review.gif`,
        caption:
          'A mandatory fact is unresolved. Record Yes/No in the hub, then re-run Analyze.',
      },
      {
        label: 'DO NOT APPLY',
        src: `${DEMO_BASE}/analyze-do-not-apply.gif`,
        caption: 'Applyability fails; no resume version is recommended.',
      },
    ],
    autofillTabs: [
      {
        label: 'Work & education',
        src: `${DEMO_BASE}/autofill-experience.gif`,
        caption:
          'Work history and education from the hub. On Phenom, Role description is also filled.',
      },
      {
        label: 'Profile basics',
        src: `${DEMO_BASE}/autofill-profile.gif`,
        caption:
          'Contact and work-authorization fields. Availability / start date is left blank.',
      },
      {
        label: 'Voluntary info',
        src: `${DEMO_BASE}/autofill-voluntary.gif`,
        caption:
          'Sex, gender identity, ethnicity, and acknowledgment. Submit remains manual.',
      },
    ],
  },
  ko: {
    analyzeTitle: '분석',
    autofillTitle: '자동 입력',
    placeholderHint: '녹화본 준비 중. public/에 GIF를 추가하세요.',
    analyzeTabs: [
      {
        label: '지원',
        src: `${DEMO_BASE}/analyze-apply.gif`,
        caption: 'APPLY 판정과 선택된 이력서 버전.',
      },
      {
        label: '주의하며 지원',
        src: `${DEMO_BASE}/analyze-caution.gif`,
        caption: '지원은 가능하나, 우대 요건 공백이 함께 표시됩니다.',
      },
      {
        label: '검토 필요',
        src: `${DEMO_BASE}/analyze-needs-review.gif`,
        caption:
          '필수 사실이 미확정입니다. hub에 Yes/No를 기록한 뒤 Analyze를 다시 실행합니다.',
      },
      {
        label: '지원하지 않음',
        src: `${DEMO_BASE}/analyze-do-not-apply.gif`,
        caption: '지원 가능 여부 판정 실패. 이력서 버전을 추천하지 않습니다.',
      },
    ],
    autofillTabs: [
      {
        label: '경력·학력',
        src: `${DEMO_BASE}/autofill-experience.gif`,
        caption:
          'hub의 경력·학력을 채웁니다. Phenom에서는 Role description도 채웁니다.',
      },
      {
        label: '기본 정보',
        src: `${DEMO_BASE}/autofill-profile.gif`,
        caption:
          '연락처와 근무 허가 관련 필드를 채웁니다. 입사 가능일/시작일은 비워 둡니다.',
      },
      {
        label: '자발적 정보',
        src: `${DEMO_BASE}/autofill-voluntary.gif`,
        caption:
          '성별, Gender Identity, ethnicity, 동의 항목. 제출은 사용자가 수행합니다.',
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
