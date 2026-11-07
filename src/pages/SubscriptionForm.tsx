import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { DiscountType, Subscription, SubscriptionStatus } from '../types'
import { useStore } from '../store/StoreContext'
import { costPerCycle, monthlyCost } from '../lib/calc'
import { addMonths } from '../lib/date'
import { formatWon, newId, paymentLabel } from '../lib/format'
import { Field, Icon, NumberInput, PageHeader } from '../components/ui'
import { Collapse, Segmented, shakeErrors } from '../components/motion'
import { useToast } from '../components/Toast'
import CatalogSearch from '../components/CatalogSearch'
import DateField from '../components/DateField'
import { subscriptionName, type CatalogPlan, type PriceOption } from '../lib/catalog'
import { useCatalog } from '../lib/useCatalog'

type Num = number | ''

interface Draft {
  name: string
  category: string
  listPrice: Num
  cyclePreset: '1' | '3' | '6' | '12' | 'custom'
  customCycle: Num
  nextBillingDate: string
  paymentMethodId: string
  status: SubscriptionStatus
  trialEndDate: string
  priceAfterTrial: Num
  discountType: DiscountType
  discountValue: Num
  shareMode: 'split' | 'fixed'
  shareCount: Num
  myShareOverride: Num
  memo: string
  catalogId: string | null
}

const CYCLES = ['1', '3', '6', '12'] as const
const CATEGORIES = ['OTT', '음악', '쇼핑', '클라우드', '도서', '생산성', '게임', '기타']

function toDraft(sub: Subscription | undefined, today: string): Draft {
  if (!sub) {
    return {
      name: '',
      category: '',
      listPrice: '',
      cyclePreset: '1',
      customCycle: '',
      nextBillingDate: addMonths(today, 1),
      paymentMethodId: '',
      status: 'active',
      trialEndDate: '',
      priceAfterTrial: '',
      discountType: 'none',
      discountValue: '',
      shareMode: 'split',
      shareCount: 1,
      myShareOverride: '',
      memo: '',
      catalogId: null,
    }
  }
  const preset = (CYCLES as readonly string[]).includes(String(sub.cycleMonths)) ? (String(sub.cycleMonths) as Draft['cyclePreset']) : 'custom'
  return {
    name: sub.name,
    category: sub.category,
    listPrice: sub.listPrice,
    cyclePreset: preset,
    customCycle: preset === 'custom' ? sub.cycleMonths : '',
    nextBillingDate: sub.nextBillingDate,
    paymentMethodId: sub.paymentMethodId ?? '',
    status: sub.status,
    trialEndDate: sub.trialEndDate ?? '',
    priceAfterTrial: sub.priceAfterTrial ?? '',
    discountType: sub.discountType,
    discountValue: sub.discountType === 'none' ? '' : sub.discountValue,
    shareMode: sub.myShareOverride != null ? 'fixed' : 'split',
    shareCount: sub.shareCount,
    myShareOverride: sub.myShareOverride ?? '',
    memo: sub.memo,
    catalogId: sub.catalogId ?? null,
  }
}

function cycleDraft(cycleMonths: number): Pick<Draft, 'cyclePreset' | 'customCycle'> {
  return (CYCLES as readonly string[]).includes(String(cycleMonths)) ? { cyclePreset: String(cycleMonths) as Draft['cyclePreset'], customCycle: '' } : { cyclePreset: 'custom', customCycle: cycleMonths }
}

function optionLabel(o: PriceOption): string {
  if (o.price === 0) return o.label
  return `${o.label} ${formatWon(o.price)}`
}

type Errors = Partial<Record<string, string>>

function validate(d: Draft): Errors {
  const e: Errors = {}
  const nonNeg = (v: Num) => v !== '' && Number.isInteger(v) && v >= 0
  if (!d.name.trim()) e.name = '서비스명을 입력하세요'
  if (!nonNeg(d.listPrice)) e.listPrice = '0 이상의 정수(원)를 입력하세요'
  if (d.cyclePreset === 'custom' && !(d.customCycle !== '' && Number.isInteger(d.customCycle) && d.customCycle >= 1 && d.customCycle <= 120))
    e.customCycle = '1~120 사이의 개월 수를 입력하세요'
  if (d.status !== 'trial' && !d.nextBillingDate) e.nextBillingDate = '다음 결제일을 입력하세요'
  if (d.status === 'trial') {
    if (!d.trialEndDate) e.trialEndDate = '체험 종료일을 입력하세요'
    if (d.priceAfterTrial !== '' && !nonNeg(d.priceAfterTrial)) e.priceAfterTrial = '0 이상의 정수(원)를 입력하세요'
  }
  if (d.discountType !== 'none') {
    if (!nonNeg(d.discountValue)) e.discountValue = '0 이상의 정수를 입력하세요'
    else if (d.discountType === 'percent' && (d.discountValue as number) > 100) e.discountValue = '할인율은 100% 이하여야 해요'
    else if (d.discountType === 'amount' && d.listPrice !== '' && (d.discountValue as number) > d.listPrice) e.discountValue = '할인 금액이 정가보다 커요'
  }
  if (d.shareMode === 'split' && !(d.shareCount !== '' && Number.isInteger(d.shareCount) && d.shareCount >= 1 && d.shareCount <= 100))
    e.shareCount = '공유 인원은 1명 이상이어야 해요'
  if (d.shareMode === 'fixed' && !nonNeg(d.myShareOverride)) e.myShareOverride = '내가 내는 금액을 입력하세요'
  return e
}

const Chips = Segmented

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="panel space-y-4 p-5">
      <legend className="float-left mb-2 w-full text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  )
}

export default function SubscriptionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, today, saveSubscription, deleteSubscription } = useStore()
  const toast = useToast()
  const existing = id ? data.subscriptions.find((s) => s.id === id) : undefined
  const [d, setD] = useState<Draft>(() => toDraft(existing, today))
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const catalog = useCatalog()
  const linkedPlan = d.catalogId ? catalog?.plans.find((p) => p.id === d.catalogId) : undefined

  if (id && !existing) {
    return (
      <p className="py-20 text-center text-ink-2">
        구독을 찾을 수 없어요.{' '}
        <Link to="/" className="link">
          돌아가기
        </Link>
      </p>
    )
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))
  const errors = validate(d)
  const err = (k: string) => (submitted ? errors[k] : undefined)
  const cycleMonths = d.cyclePreset === 'custom' ? Number(d.customCycle) || 1 : Number(d.cyclePreset)

  const toSubscription = (): Subscription => {
    return {
      id: existing?.id ?? newId(),
      name: d.name.trim(),
      category: d.category.trim(),
      listPrice: Number(d.listPrice) || 0,
      cycleMonths,
      nextBillingDate: d.status === 'trial' ? d.trialEndDate : d.nextBillingDate,
      paymentMethodId: d.paymentMethodId || null,
      status: d.status,
      trialEndDate: d.status === 'trial' ? d.trialEndDate : null,
      priceAfterTrial: d.status === 'trial' && d.priceAfterTrial !== '' ? d.priceAfterTrial : null,
      discountType: d.discountType,
      discountValue: d.discountType === 'none' ? 0 : Number(d.discountValue) || 0,
      shareCount: d.shareMode === 'split' ? Number(d.shareCount) || 1 : 1,
      myShareOverride: d.shareMode === 'fixed' ? Number(d.myShareOverride) || 0 : null,
      memo: d.memo.trim(),
      catalogId: d.catalogId,
    }
  }

  /** 카탈로그 요금제를 고르면 이름·카테고리·가격·주기를 채운다 */
  function applyPlan(plan: CatalogPlan) {
    const price = plan.prices[0]
    setD((p) => ({
      ...p,
      name: subscriptionName(plan),
      category: plan.category,
      catalogId: plan.id,
      ...(price ? { listPrice: price.price, ...cycleDraft(price.cycleMonths) } : { listPrice: '' }),
    }))
    toast(`${subscriptionName(plan)} 요금제 정보를 불러왔어요`)
  }

  const preview = toSubscription()
  const basePrice = d.status === 'trial' && d.priceAfterTrial !== '' ? d.priceAfterTrial : preview.listPrice
  const perCycle = costPerCycle(preview, basePrice)
  const monthly = monthlyCost(preview, basePrice)
  const monthlyList = Math.round(basePrice / cycleMonths)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length > 0) {
      const form = e.currentTarget as HTMLFormElement
      // 오류 표시가 그려진 다음 프레임에 흔들고 첫 오류로 스크롤
      requestAnimationFrame(() => {
        shakeErrors(form)
        form.querySelector('.input-error, [data-error]')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      })
      return
    }
    const sub = toSubscription()
    setSaving(true)
    try {
      await saveSubscription(sub)
      toast(existing ? '변경사항을 저장했어요' : `${sub.name}을(를) 추가했어요`)
      navigate(`/subscriptions/${sub.id}`, { replace: true })
    } catch {
      setSaving(false)
    }
  }

  async function remove() {
    if (!existing) return
    if (!confirm(`'${existing.name}' 구독과 모든 사용 기록을 삭제할까요?`)) return
    await deleteSubscription(existing.id)
    toast(`${existing.name}을(를) 삭제했어요`)
    navigate('/', { replace: true })
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-xl space-y-4 pb-2">
      <PageHeader
        title={existing ? '구독 편집' : '구독 추가'}
        back={
          <button type="button" className="link mb-2 inline-flex items-center gap-1 text-sm" onClick={() => navigate(-1)}>
            <Icon name="back" size={14} />
            뒤로
          </button>
        }
      />

      <FormSection title="기본 정보">
        <Field label="서비스명" error={err('name')} hint={linkedPlan ? undefined : '목록에서 고르면 가격이 채워지고 상세 화면에 혜택이 안내돼요. 목록에 없으면 이름만 입력하세요.'}>
          <CatalogSearch value={d.name} onChange={(v) => set('name', v)} onPick={applyPlan} invalid={!!err('name')} />
        </Field>
        <Collapse open={!!linkedPlan}>
          {linkedPlan && (
            <div className="mb-1 space-y-2 rounded-lg bg-sunken p-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1">
                  <b className="font-medium">
                    {linkedPlan.service} · {linkedPlan.plan}
                  </b>
                  <span className="block text-xs whitespace-pre-line text-ink-2">{linkedPlan.priceText}</span>
                </span>
                <button type="button" className="link shrink-0 text-xs" onClick={() => set('catalogId', null)}>
                  연결 해제
                </button>
              </div>
              {linkedPlan.prices.length > 1 && (
                <Segmented
                  label="가격 옵션"
                  value={String(linkedPlan.prices.findIndex((o) => o.price === d.listPrice && o.cycleMonths === cycleMonths))}
                  onChange={(v) => {
                    const o = linkedPlan.prices[Number(v)]
                    setD((p) => ({ ...p, listPrice: o.price, ...cycleDraft(o.cycleMonths) }))
                  }}
                  options={linkedPlan.prices.map((o, i) => ({ value: String(i), label: optionLabel(o) }))}
                  className="bg-surface/70"
                />
              )}
            </div>
          )}
        </Collapse>
        <Field label="카테고리">
          <input className="input" list="categories" value={d.category} onChange={(e) => set('category', e.target.value)} placeholder="예: OTT" maxLength={20} />
          <datalist id="categories">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <div>
          <span className="label">상태</span>
          <Chips<SubscriptionStatus>
            value={d.status}
            onChange={(v) => set('status', v)}
            options={[
              { value: 'active', label: '구독중' },
              { value: 'trial', label: '무료체험' },
              { value: 'canceling', label: '해지예정' },
            ]}
          />
        </div>
      </FormSection>

      <FormSection title="결제">
        <Field label="정가 (1회 결제 금액)" error={err('listPrice')}>
          <NumberInput value={d.listPrice} onChange={(v) => set('listPrice', v)} suffix="원" min={0} placeholder="0" invalid={!!err('listPrice')} />
        </Field>
        <div>
          <span className="label">결제주기</span>
          <Chips
            value={d.cyclePreset}
            onChange={(v) => set('cyclePreset', v)}
            options={[
              { value: '1', label: '1개월' },
              { value: '3', label: '3개월' },
              { value: '6', label: '6개월' },
              { value: '12', label: '12개월' },
              { value: 'custom', label: '직접' },
            ]}
          />
          <Collapse open={d.cyclePreset === 'custom'}>
            <div className="pt-2">
              <Field label="" error={err('customCycle')}>
                <NumberInput value={d.customCycle} onChange={(v) => set('customCycle', v)} suffix="개월" min={1} placeholder="N" invalid={!!err('customCycle')} />
              </Field>
            </div>
          </Collapse>
        </div>

        <div>
          <Collapse open={d.status === 'trial'}>
            <div className="grid gap-4 rounded-xl bg-sunken p-3 sm:grid-cols-2">
              <DateField label="체험 종료일" error={err('trialEndDate')} value={d.trialEndDate} onChange={(v) => set('trialEndDate', v)} />
              <Field label="종료 후 결제 금액" error={err('priceAfterTrial')} hint="비우면 정가">
                <NumberInput
                  value={d.priceAfterTrial}
                  onChange={(v) => set('priceAfterTrial', v)}
                  suffix="원"
                  min={0}
                  placeholder={String(d.listPrice || 0)}
                  invalid={!!err('priceAfterTrial')}
                />
              </Field>
            </div>
          </Collapse>
          <Collapse open={d.status !== 'trial'}>
            <DateField label="다음 결제일" error={err('nextBillingDate')} hint="지나면 주기만큼 자동으로 넘어가요" value={d.nextBillingDate} onChange={(v) => set('nextBillingDate', v)} />
          </Collapse>
        </div>

        <Field label="결제수단">
          <select className="input" value={d.paymentMethodId} onChange={(e) => set('paymentMethodId', e.target.value)}>
            <option value="">선택 안 함</option>
            {data.paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {paymentLabel(pm)}
              </option>
            ))}
          </select>
          {data.paymentMethods.length === 0 && (
            <span className="mt-1 block text-xs text-ink-2">
              <Link to="/payment-methods" className="link underline">
                결제수단 관리
              </Link>
              에서 먼저 등록하세요.
            </span>
          )}
        </Field>
      </FormSection>

      <FormSection title="할인 · 공유">
        <div>
          <span className="label">할인</span>
          <Chips<DiscountType>
            value={d.discountType}
            onChange={(v) => set('discountType', v)}
            options={[
              { value: 'none', label: '없음' },
              { value: 'amount', label: '정액(원)' },
              { value: 'percent', label: '정률(%)' },
            ]}
          />
          <Collapse open={d.discountType !== 'none'}>
            <div className="pt-2">
              <Field label="" error={err('discountValue')} hint="예: 카드 청구할인, 통신사 제휴">
                <NumberInput
                  value={d.discountValue}
                  onChange={(v) => set('discountValue', v)}
                  suffix={d.discountType === 'percent' ? '%' : '원'}
                  min={0}
                  invalid={!!err('discountValue')}
                />
              </Field>
            </div>
          </Collapse>
        </div>
        <div>
          <span className="label">공유</span>
          <Chips
            value={d.shareMode}
            onChange={(v) => set('shareMode', v)}
            options={[
              { value: 'split', label: '인원수로 나누기' },
              { value: 'fixed', label: '내 부담액 직접 입력' },
            ]}
          />
          <div className="mt-2">
            <Collapse open={d.shareMode === 'split'}>
              <Field label="" error={err('shareCount')} hint="혼자 쓰면 1">
                <NumberInput value={d.shareCount} onChange={(v) => set('shareCount', v)} suffix="명" min={1} invalid={!!err('shareCount')} />
              </Field>
            </Collapse>
            <Collapse open={d.shareMode === 'fixed'}>
              <Field label="" error={err('myShareOverride')} hint="결제 1회당 내가 내는 금액">
                <NumberInput value={d.myShareOverride} onChange={(v) => set('myShareOverride', v)} suffix="원" min={0} invalid={!!err('myShareOverride')} />
              </Field>
            </Collapse>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-sunken px-4 py-3 text-sm">
          <span className="text-ink-2">
            {d.status === 'trial' ? '체험 종료 후 ' : ''}실부담액{cycleMonths > 1 ? ` (${cycleMonths}개월 ${formatWon(perCycle)})` : ''}
          </span>
          <span className="num text-base font-semibold">
            월 {formatWon(monthly)}
            {monthlyList !== monthly && <span className="ml-1.5 text-xs font-medium text-ink-3 line-through">{formatWon(monthlyList)}</span>}
          </span>
        </div>
      </FormSection>

      <FormSection title="메모">
        <textarea className="input min-h-20" value={d.memo} onChange={(e) => set('memo', e.target.value)} maxLength={500} placeholder="선택" />
      </FormSection>

      {submitted && Object.keys(errors).length > 0 && <p className="text-center text-sm text-danger">입력값을 확인해주세요.</p>}

      <div className="sticky bottom-3 z-10 flex gap-2 rounded-xl bg-surface/90 p-2 shadow-raised ring-1 ring-line backdrop-blur">
        {existing && (
          <button type="button" className="btn-danger" onClick={remove}>
            삭제
          </button>
        )}
        <button className="btn-primary flex-1" disabled={saving}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </form>
  )
}
