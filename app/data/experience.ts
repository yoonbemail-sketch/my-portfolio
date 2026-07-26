import type { Locale } from 'app/i18n/config'

export type ExperienceItem = {
  id: string
  dateLabel: string
  title: string
  employer: string
  location?: string
  summary: string
  highlights: string[]
}

export type EducationItem = {
  id: string
  dateLabel: string
  degree: string
  school: string
  detail: string
}

/** Public subset for the portfolio. Keep in sync with LinkedIn / resume hub. */
const experienceEn: ExperienceItem[] = [
  {
    id: 'rok-army',
    dateLabel: '2021–2022',
    title: 'Inventory & Transportation Specialist',
    employer: 'Republic of Korea Army',
    location: 'South Korea',
    summary:
      'Managed inventory and maintenance data for heavy recovery vehicles and kept operational readiness high.',
    highlights: [
      'Maintained recovery-vehicle inventory/maintenance accuracy and 100% operational readiness',
      'Monitored parts and equipment stock with Excel usage logs for timely replenishment',
      'Ran towing and recovery operations under pressure while keeping a zero-incident safety record',
    ],
  },
  {
    id: 'kj-technology',
    dateLabel: 'Jul–Dec 2020',
    title: 'Production Control & ISO Assistant',
    employer: 'KJTechnology',
    location: 'South Korea',
    summary:
      'Organized documentation and standardized production procedures for ISO 9001:2015 certification.',
    highlights: [
      'Prepared certification audits by organizing technical documents and standardizing operating procedures',
      'Validated process compliance and record quality with production teams',
      'Supported building a quality-management system through certification',
    ],
  },
  {
    id: 'within-company',
    dateLabel: 'Jan–Jun 2020',
    title: 'Supply Chain Manager',
    employer: 'Within Company Co., Ltd.',
    location: 'South Korea',
    summary:
      'Analyzed delivery routes and schedules to cut delivery time and run daily logistics operations.',
    highlights: [
      'Identified delivery-network inefficiencies using route data from 14 drivers',
      'Cut total delivery time by 23% through route rebalancing and time-slot adjustments',
      'Monitored daily logistics schedules and on-time delivery for 2,500 meals',
    ],
  },
]

const experienceKo: ExperienceItem[] = [
  {
    id: 'rok-army',
    dateLabel: '2021–2022',
    title: 'Inventory & Transportation Specialist',
    employer: 'Republic of Korea Army',
    location: 'South Korea',
    summary:
      '중장비 회수 차량의 재고·정비 데이터를 관리하고, 운용 준비태세를 유지했습니다.',
    highlights: [
      '회수 차량 재고·정비 데이터 정확도와 100% 운용 준비태세 유지',
      '엑셀 사용 로그로 부품·장비 재고를 모니터링하고 적시 보급',
      '고압 환경에서 견인·회수 운용, 안전 프로토콜 준수로 무사고 유지',
    ],
  },
  {
    id: 'kj-technology',
    dateLabel: 'Jul–Dec 2020',
    title: 'Production Control & ISO Assistant',
    employer: 'KJTechnology',
    location: 'South Korea',
    summary:
      'ISO 9001:2015 인증을 위해 문서를 정리하고 생산 절차를 표준화했습니다.',
    highlights: [
      '기술 문서 정리와 운영 절차 표준화로 인증 심사 준비',
      '생산팀과 프로세스 준수·기록 품질을 검증',
      '품질경영 체계 구축에 기여하며 인증 취득 지원',
    ],
  },
  {
    id: 'within-company',
    dateLabel: 'Jan–Jun 2020',
    title: 'Supply Chain Manager',
    employer: 'Within Company Co., Ltd.',
    location: 'South Korea',
    summary:
      '배송 경로와 스케줄을 분석해 배송 시간을 줄이고 일일 물류를 운영했습니다.',
    highlights: [
      '14명 드라이버 경로 데이터로 배송망 비효율 구간 파악',
      '경로 재배치·타임슬롯 조정으로 총 배송 시간 23% 단축',
      '일 2,500식 물류 스케줄과 온타임 배송 모니터링',
    ],
  },
]

const educationEn: EducationItem[] = [
  {
    id: 'uwaterloo',
    dateLabel: '2020–2025',
    degree: 'Bachelor of Mathematics',
    school: 'University of Waterloo',
    detail: 'Mathematical Optimization · Computational Mathematics',
  },
]

const educationKo: EducationItem[] = [
  {
    id: 'uwaterloo',
    dateLabel: '2020–2025',
    degree: 'Bachelor of Mathematics',
    school: 'University of Waterloo',
    detail: 'Mathematical Optimization · Computational Mathematics',
  },
]

export function getExperience(locale: Locale): ExperienceItem[] {
  return locale === 'ko' ? experienceKo : experienceEn
}

export function getEducation(locale: Locale): EducationItem[] {
  return locale === 'ko' ? educationKo : educationEn
}
