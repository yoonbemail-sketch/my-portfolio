import { BlogPosts } from 'app/components/posts'
import { Experience } from 'app/components/experience'

export default function Page() {
  return (
    <section>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Lee</h1>
      <p className="mb-6 text-neutral-600 dark:text-neutral-400">
        Operations Analyst · Mathematical Optimization (OR) · PL-300 · LSSGB
      </p>
      <p className="mb-4 leading-7 text-neutral-800 dark:text-neutral-200">
        Mathematical Optimization(Operations Research)을 전공하고, PL-300과
        LSSGB를 보유한 Operations Analyst입니다. 운영 데이터를 구조화하고,
        의사결정을 모델로 정리하며, 실제로 쓰이는 리포팅을 만드는 일에
        집중합니다.
      </p>
      <p className="mb-8 leading-7 text-neutral-800 dark:text-neutral-200">
        물류·품질·재고 현장에서 쌓은 운영 경험과, 분석·자동화 프로젝트를
        아래에 정리합니다.
      </p>

      <h2 className="mb-4 text-lg font-medium tracking-tight">Experience</h2>
      <div className="mb-12">
        <Experience />
      </div>

      <h2 className="mb-4 text-lg font-medium tracking-tight">Projects</h2>
      <BlogPosts />
    </section>
  )
}
