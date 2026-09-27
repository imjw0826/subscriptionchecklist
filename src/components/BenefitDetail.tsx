import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Benefit, Subscription } from '../types'
import { useStore } from '../store/StoreContext'
import { benefitAchievement, isBenefitChecked, monthlySavings } from '../lib/calc'
import { formatDate, isSameMonth, monthKey } from '../lib/date'
import { formatWon, newId } from '../lib/format'
import { AchievementGauge, Empty, Field, Modal, NumberInput, Section } from './ui'
import { AnimatedNumber, Checkbox } from './motion'
import { useToast } from './Toast'

export default function BenefitDetail({ sub, monthly }: { sub: Subscription; monthly: number }) {
  const { data, today, addBenefitUse, deleteBenefitUse } = useStore()
  const toast = useToast()
  const benefits = data.benefits.filter((b) => b.subscriptionId === sub.id)
  const uses = data.benefitUses.filter((u) => u.subscriptionId === sub.id).sort((a, b) => b.date.localeCompare(a.date))
  const savings = monthlySavings(data.benefitUses, sub.id, today)
  const pct = benefitAchievement(savings, monthly)
  const benefitName = new Map(benefits.map((b) => [b.id, b.name]))

  const [target, setTarget] = useState<Benefit | null>(null)
  const [amount, setAmount] = useState<number | ''>('')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [showAll, setShowAll] = useState(false)

  function openModal(b: Benefit) {
    setTarget(b)
    setAmount(b.estimatedValue)
    setDate(today)
    setNote('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!target || amount === '' || amount < 0 || !date) return
    await addBenefitUse({ id: newId(), benefitId: target.id, subscriptionId: sub.id, date, savedAmount: Math.round(amount), note: note.trim() })
    setTarget(null)
    toast(`${target.name} +${formatWon(Math.round(amount))} 기록됨`)
  }

  async function uncheck(b: Benefit) {
    const own = uses.filter((u) => u.benefitId === b.id && (b.resetCycle === 'none' || isSameMonth(u.date, today)))
    if (!confirm(`'${b.name}' 체크를 해제하면 ${b.resetCycle === 'monthly' ? '이번 달 ' : ''}사용 기록 ${own.length}건이 삭제돼요. 계속할까요?`)) return
    for (const u of own) await deleteBenefitUse(u.id)
    toast(`${b.name} 체크 해제됨`)
  }

  const visibleUses = showAll ? uses : uses.filter((u) => isSameMonth(u.date, today))
  const grouped = new Map<string, typeof uses>()
  for (const u of visibleUses) {
    const k = monthKey(u.date)
    grouped.set(k, [...(grouped.get(k) ?? []), u])
  }
  const leftToBreakEven = Math.max(0, monthly - savings)

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <section className="panel p-5 md:self-start">
        <AchievementGauge pct={pct} />
        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-2">이번 달 절약액</span>
            <AnimatedNumber value={savings} format={formatWon} className="font-medium text-ok-ink" />
          </div>
          <div className="flex justify-between">
            <span className="text-ink-2">월 실부담액</span>
            <b>{formatWon(monthly)}</b>
          </div>
          <p className="pt-2 text-center text-xs text-ink-2">{leftToBreakEven > 0 ? `본전까지 ${formatWon(leftToBreakEven)} 남았어요` : '이번 달 본전 달성! 🎉'}</p>
        </div>
      </section>

      <div className="space-y-4">
        <Section
          title="혜택 체크리스트"
          action={
            <Link to={`/subscriptions/${sub.id}/edit`} className="text-sm link">
              혜택 편집
            </Link>
          }
        >
          {benefits.length === 0 ? (
            <Empty>등록된 혜택이 없어요. 편집에서 혜택 항목을 추가하세요.</Empty>
          ) : (
            <ul className="space-y-2">
              {benefits.map((b) => {
                const own = uses.filter((u) => u.benefitId === b.id)
                const checked = isBenefitChecked(b.resetCycle, own, today)
                const monthCount = own.filter((u) => isSameMonth(u.date, today)).length
                return (
                  <li key={b.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors duration-300 ${checked ? 'border-transparent bg-sunken/70' : 'border-line'}`}>
                    <Checkbox checked={checked} onClick={() => (checked ? uncheck(b) : openModal(b))} label={b.name} />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate transition-colors duration-300 ${checked ? 'text-ink-3' : ''}`}>{b.name}</p>
                      <p className="text-xs text-ink-3">
                        1회 약 {formatWon(b.estimatedValue)} · {b.resetCycle === 'monthly' ? '매월 1일 리셋' : '리셋 없음'}
                        {monthCount > 0 && ` · 이번 달 ${monthCount}회`}
                      </p>
                    </div>
                    {checked && (
                      <button className="btn-ghost shrink-0 px-2.5 py-1.5 text-xs" onClick={() => openModal(b)}>
                        + 또 사용
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        <Section
          title="사용 기록"
          action={
            <button className="text-sm link" onClick={() => setShowAll((v) => !v)}>
              {showAll ? '이번 달만' : '전체 보기'}
            </button>
          }
        >
          {grouped.size === 0 ? (
            <Empty>{showAll ? '사용 기록이 없어요.' : '이번 달 사용 기록이 없어요.'}</Empty>
          ) : (
            <div className="space-y-4">
              {[...grouped.entries()].map(([month, list]) => (
                <div key={month}>
                  <p className="mb-1 flex justify-between text-xs font-medium text-ink-2">
                    <span>{month.replace('-', '년 ')}월</span>
                    <span>{formatWon(list.reduce((s, u) => s + u.savedAmount, 0))}</span>
                  </p>
                  <ul className="divide-y divide-line">
                    {list.map((u) => (
                      <li key={u.id} className="t-reveal flex items-center gap-3 py-2 text-sm">
                        <span className="w-20 shrink-0 text-ink-2">{formatDate(u.date).slice(5)}</span>
                        <span className="min-w-0 flex-1 truncate">
                          {benefitName.get(u.benefitId) ?? '삭제된 혜택'}
                          {u.note && <span className="text-ink-2"> · {u.note}</span>}
                        </span>
                        <b>+{formatWon(u.savedAmount)}</b>
                        <button className="px-1 text-ink-3 hover:text-danger-ink" aria-label="기록 삭제" onClick={() => confirm('이 기록을 삭제할까요?') && deleteBenefitUse(u.id)}>
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Modal open={!!target} onClose={() => setTarget(null)} title={target ? `${target.name} 사용` : ''}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="실제 절약액" hint={target ? `추정 가치 ${formatWon(target.estimatedValue)}` : undefined} error={amount !== '' && amount < 0 ? '0 이상 입력' : undefined}>
            <NumberInput value={amount} onChange={setAmount} suffix="원" min={0} autoFocus />
          </Field>
          <Field label="날짜">
            <input type="date" className="input" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="메모 (선택)">
            <input className="input" value={note} maxLength={100} onChange={(e) => setNote(e.target.value)} placeholder="예: 생수 2박스" />
          </Field>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setTarget(null)}>
              취소
            </button>
            <button className="btn-accent flex-1" disabled={amount === '' || amount < 0 || !date}>
              기록
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
