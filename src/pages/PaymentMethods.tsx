import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { PaymentMethod, PaymentMethodType } from '../types'
import { useStore } from '../store/StoreContext'
import { monthlyCost, subtotalsByPaymentMethod } from '../lib/calc'
import { formatWon, newId } from '../lib/format'
import { Avatar, Empty, Field, Icon, Modal, PageHeader, StatusBadge } from '../components/ui'
import { AnimatedNumber, Segmented, shakeErrors } from '../components/motion'
import { useToast } from '../components/Toast'

const TYPE_LABEL: Record<PaymentMethodType, string> = { card: '카드', account: '계좌', easypay: '간편결제' }

interface Draft {
  id: string | null
  nickname: string
  type: PaymentMethodType
  last4: string
}

export default function PaymentMethods() {
  const { data, savePaymentMethod, deletePaymentMethod } = useStore()
  const toast = useToast()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const subtotals = subtotalsByPaymentMethod(data.subscriptions, data.paymentMethods)
  const subById = new Map(data.subscriptions.map((s) => [s.id, s]))

  const errors = draft
    ? {
        nickname: draft.nickname.trim() ? undefined : '별칭을 입력하세요',
        last4: /^\d{0,4}$/.test(draft.last4) && (draft.last4.length === 0 || draft.last4.length === 4) ? undefined : '숫자 4자리를 입력하세요',
      }
    : {}

  function open(pm?: PaymentMethod) {
    setSubmitted(false)
    setDraft(pm ? { ...pm } : { id: null, nickname: '', type: 'card', last4: '' })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!draft) return
    if (errors.nickname || errors.last4) {
      const form = e.currentTarget as HTMLFormElement
      requestAnimationFrame(() => shakeErrors(form))
      return
    }
    await savePaymentMethod({ id: draft.id ?? newId(), nickname: draft.nickname.trim(), type: draft.type, last4: draft.last4 })
    setDraft(null)
    toast(draft.id ? '결제수단을 수정했어요' : `${draft.nickname.trim()}을(를) 추가했어요`)
  }

  async function remove(pm: PaymentMethod) {
    const linked = data.subscriptions.filter((s) => s.paymentMethodId === pm.id).length
    if (!confirm(linked ? `'${pm.nickname}'에 연결된 구독 ${linked}개는 결제수단 없음으로 바뀌어요. 삭제할까요?` : `'${pm.nickname}'을(를) 삭제할까요?`)) return
    await deletePaymentMethod(pm.id)
    setDraft(null)
    toast(`${pm.nickname}을(를) 삭제했어요`)
  }

  const cards = subtotals.map((st) => ({ st, pm: data.paymentMethods.find((p) => p.id === st.paymentMethodId) })).filter(({ st, pm }) => pm || st.subscriptionIds.length > 0)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title="결제수단">
        <button className="btn-primary" onClick={() => open()}>
          <Icon name="plus" size={16} />
          결제수단
        </button>
      </PageHeader>

      {cards.length === 0 ? (
        <div className="panel">
          <Empty>등록된 결제수단이 없어요.</Empty>
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ st, pm }) => (
            <section key={st.paymentMethodId ?? 'none'} className="panel p-5">
              <div className="flex items-center gap-3">
                <span className={pm ? 'icon-box' : 'icon-box bg-sunken text-ink-3'}>
                  <Icon name={pm?.type === 'card' ? 'card' : 'wallet'} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{pm ? pm.nickname : '결제수단 없음'}</p>
                  <p className="text-xs text-ink-3">{pm ? `${TYPE_LABEL[pm.type]}${pm.last4 ? ` · •••• ${pm.last4}` : ''}` : '미지정 구독'}</p>
                </div>
                {pm && (
                  <button className="btn-ghost px-3 py-1.5" onClick={() => open(pm)}>
                    편집
                  </button>
                )}
              </div>
              <div className="mt-4 flex items-end justify-between">
                <p className="text-3xl tracking-tight">
                  <AnimatedNumber value={st.monthly} format={formatWon} />
                  <span className="ml-1 text-sm text-ink-2">/월</span>
                </p>
                <span className="tag-neutral mb-1.5">구독 {st.subscriptionIds.length}개</span>
              </div>
              {st.subscriptionIds.length > 0 && (
                <ul className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
                  {st.subscriptionIds.map((id) => {
                    const s = subById.get(id)!
                    return (
                      <li key={id}>
                        <Link to={`/subscriptions/${id}`} className="-mx-2 flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-sunken">
                          <Avatar name={s.name} size={24} muted={s.status === 'canceling'} />
                          <span className="min-w-0 flex-1 truncate">{s.name}</span>
                          <StatusBadge status={s.status} />
                          <span className={s.status === 'active' ? '' : 'text-ink-3'}>{formatWon(monthlyCost(s))}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? '결제수단 편집' : '결제수단 추가'}>
        {draft && (
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label="별칭" error={submitted ? errors.nickname : undefined}>
              <input
                className={`input ${submitted && errors.nickname ? 'input-error' : ''}`}
                value={draft.nickname}
                maxLength={30}
                autoFocus
                placeholder="예: 신한 딥드림"
                onChange={(e) => setDraft({ ...draft, nickname: e.target.value })}
              />
            </Field>
            <div>
              <span className="label">종류</span>
              <Segmented<PaymentMethodType>
                value={draft.type}
                onChange={(t) => setDraft({ ...draft, type: t })}
                options={(Object.keys(TYPE_LABEL) as PaymentMethodType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
              />
            </div>
            <Field label="끝 4자리 (선택)" error={submitted ? errors.last4 : undefined}>
              <input
                className={`input ${submitted && errors.last4 ? 'input-error' : ''}`}
                value={draft.last4}
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                placeholder="1234"
                onChange={(e) => setDraft({ ...draft, last4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              />
            </Field>
            <div className="flex gap-2">
              {draft.id && (
                <button type="button" className="btn-danger" onClick={() => remove(draft as PaymentMethod)}>
                  삭제
                </button>
              )}
              <button type="button" className="btn-ghost flex-1" onClick={() => setDraft(null)}>
                취소
              </button>
              <button className="btn-primary flex-1">저장</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
