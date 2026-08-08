import type { Locale } from 'app/i18n/config'
import { defaultLocale } from 'app/i18n/config'

type Dictionary = {
  nav: {
    home: string
    experience: string
    projects: string
    certifications: string
    education: string
    language: string
  }
  home: {
    role: string
    intro: string
    projectsLead: string
    experienceHeading: string
    projectsHeading: string
    certificationsHeading: string
    certificatePdf: string
    educationHeading: string
  }
  projects: {
    title: string
    description: string
  }
  footer: {
    email: string
    linkedin: string
    rss: string
    copyright: string
  }
  notFound: {
    title: string
    body: string
  }
  relative: {
    years: (n: number) => string
    months: (n: number) => string
    days: (n: number) => string
    today: string
  }
}

export const dictionaries: Record<Locale, Dictionary> = {
  ko: {
    nav: {
      home: '홈',
      experience: '경력',
      projects: '프로젝트',
      certifications: '자격증',
      education: '학력',
      language: '언어',
    },
    home: {
      role: 'Operations Analyst · Mathematical Optimization (OR) · PL-300 · LSSGB',
      intro:
        'Mathematical Optimization(Operations Research) 배경의 Operations Analyst입니다. PL-300과 LSSGB를 보유하며, 운영 데이터를 구조화하고 의사결정을 모델로 정리해 실제로 쓰이는 리포팅을 만듭니다.',
      projectsLead:
        '아래 세 가지로 정리합니다. Elevator는 OR 관점의 의사결정 실험, Kream은 운영 데이터에서 Power BI 리포팅까지, Resume Aligner는 사람 검수를 전제로 한 자동화입니다.',
      experienceHeading: '경력',
      projectsHeading: '프로젝트',
      certificationsHeading: '자격증',
      certificatePdf: '자격증 PDF 보기',
      educationHeading: '학력',
    },
    projects: {
      title: '프로젝트',
      description: '대시보드·스키마·프로세스 노트를 담은 프로젝트 정리글입니다.',
    },
    footer: {
      email: '이메일',
      linkedin: 'LinkedIn',
      rss: 'RSS',
      copyright: 'Yoon Lee · Operations Analyst',
    },
    notFound: {
      title: '404 - 페이지를 찾을 수 없습니다',
      body: '요청하신 페이지가 존재하지 않습니다.',
    },
    relative: {
      years: (n) => `${n}년 전`,
      months: (n) => `${n}개월 전`,
      days: (n) => `${n}일 전`,
      today: '오늘',
    },
  },
  en: {
    nav: {
      home: 'home',
      experience: 'experience',
      projects: 'projects',
      certifications: 'certifications',
      education: 'education',
      language: 'Language',
    },
    home: {
      role: 'Operations Analyst · Mathematical Optimization (OR) · PL-300 · LSSGB',
      intro:
        'I am an Operations Analyst with a background in Mathematical Optimization (Operations Research), holding PL-300 and LSSGB credentials. I focus on structuring operational data, modeling decisions, and shipping reporting people actually use.',
      projectsLead:
        'Three proof points below: Elevator for OR-style decision experiments, Kream for ops data → Power BI reporting, and Resume Aligner for automation under human review.',
      experienceHeading: 'Experience',
      projectsHeading: 'Projects',
      certificationsHeading: 'Certifications',
      certificatePdf: 'View certificate PDF',
      educationHeading: 'Education',
    },
    projects: {
      title: 'Projects',
      description:
        'Case write-ups with room for dashboards, schemas, and process notes.',
    },
    footer: {
      email: 'email',
      linkedin: 'linkedin',
      rss: 'rss',
      copyright: 'Yoon Lee · Operations Analyst',
    },
    notFound: {
      title: '404 - Page Not Found',
      body: 'The page you are looking for does not exist.',
    },
    relative: {
      years: (n) => `${n}y ago`,
      months: (n) => `${n}mo ago`,
      days: (n) => `${n}d ago`,
      today: 'Today',
    },
  },
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries[defaultLocale]
}
