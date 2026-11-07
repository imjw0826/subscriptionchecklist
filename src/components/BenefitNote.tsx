import { useStore } from '../store/StoreContext'
import { Section } from './ui'

/** 카탈로그에 연결되지 않은 혜택형 구독의 안내. 예전에 등록한 혜택 이름이 있으면 문장으로 보여준다 */
export default function BenefitNote({ subscriptionId }: { subscriptionId: string }) {
  const { data } = useStore()
  const names = data.benefits.filter((b) => b.subscriptionId === subscriptionId).map((b) => b.name)

  return (
    <Section title="혜택 안내">
      <p className="max-w-[68ch] text-sm leading-7 text-ink-2">
        {names.length > 0 ? `${names.join(', ')} 혜택을 받을 수 있어요.` : '등록된 혜택 안내가 없어요. 편집에서 목록의 요금제를 고르거나 메모에 적어 두세요.'}
      </p>
    </Section>
  )
}
