import { useState } from 'react'
import type { CatalogItem } from '../lib/catalog'
import { useCatalog } from '../lib/useCatalog'
import { formatDate } from '../lib/date'
import { Collapse } from './motion'
import { Section } from './ui'

function Items({ items }: { items: CatalogItem[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-3" aria-hidden />
          <div className="min-w-0">
            <span>{it.text}</span>
            {it.supplemented && <span className="tag-warn ml-1.5 align-middle">공식 외 보완</span>}
            {it.children.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-ink-2">
                {it.children.map((c, j) => (
                  <li key={j}>– {c}</li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

/** 카탈로그에서 고른 요금제의 공식 혜택·유의사항·출처 */
export default function PlanInfo({ catalogId }: { catalogId: string }) {
  const catalog = useCatalog()
  const [showNotes, setShowNotes] = useState(false)
  if (!catalog) return null
  const plan = catalog.plans.find((p) => p.id === catalogId)
  if (!plan) return null
  const service = catalog.services.find((s) => s.no === plan.serviceNo)!

  return (
    <Section title="요금제 안내" action={<span className="text-xs text-ink-3">{formatDate(catalog.researchedAt)} 조사</span>}>
      <p className="mb-1 font-medium">
        {plan.service} · {plan.plan}
        {plan.supplemented && <span className="tag-warn ml-1.5 align-middle">공식 외 보완</span>}
      </p>
      <p className="mb-4 text-sm whitespace-pre-line text-ink-2">{plan.priceText}</p>

      <p className="mb-2 text-sm text-ink-3">포함 혜택 {plan.benefits.length}개</p>
      <Items items={plan.benefits} />

      {plan.notes.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <button type="button" className="link text-sm" onClick={() => setShowNotes((v) => !v)} aria-expanded={showNotes}>
            유의사항 {plan.notes.length}개 {showNotes ? '접기' : '보기'}
          </button>
          <Collapse open={showNotes}>
            <div className="pt-3">
              <Items items={plan.notes} />
            </div>
          </Collapse>
        </div>
      )}

      {service.sources.length > 0 && (
        <p className="mt-4 border-t border-line pt-3 text-xs text-ink-3">
          출처{' '}
          {service.sources.map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noreferrer" className="link text-xs">
              {i > 0 && ', '}
              {new URL(u).hostname}
            </a>
          ))}
        </p>
      )}
    </Section>
  )
}
