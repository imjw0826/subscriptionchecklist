import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { CatalogPlan } from '../lib/catalog'
import { searchCatalog, subscriptionName } from '../lib/catalog'
import { useCatalog } from '../lib/useCatalog'
import { formatWon } from '../lib/format'
import { Avatar } from './ui'

function priceLabel(plan: CatalogPlan): string {
  const p = plan.prices[0]
  if (!p) return '가격 직접 입력'
  if (p.price === 0) return p.label
  return p.cycleMonths === 1 ? `월 ${formatWon(p.price)}` : `${p.cycleMonths}개월 ${formatWon(p.price)}`
}

/**
 * 서비스명 입력칸 겸 카탈로그 검색. 입력하면 요금제 후보가 뜨고, 고르면 onPick.
 * 비어 있을 때 포커스하면 서비스 목록을 보여줘 둘러보다 고를 수도 있다.
 * 후보를 고르지 않고 입력한 이름은 그대로 직접 입력한 구독이 된다.
 */
export default function CatalogSearch({
  value,
  onChange,
  onPick,
  invalid,
}: {
  value: string
  onChange: (v: string) => void
  onPick: (plan: CatalogPlan) => void
  invalid?: boolean
}) {
  const catalog = useCatalog()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const listRef = useRef<HTMLUListElement>(null)

  const results = useMemo(() => (catalog && value.trim() ? searchCatalog(catalog, value) : []), [catalog, value])
  const browsing = !!catalog && !value.trim()

  // 목록에 보여줄 행: 서비스 헤더 + 요금제 (검색) 또는 서비스 (둘러보기)
  type Row = { kind: 'header'; label: string; key: string } | { kind: 'plan'; plan: CatalogPlan; key: string } | { kind: 'service'; name: string; group: string; count: number; key: string }
  const rows: Row[] = []
  if (browsing) {
    let group = ''
    for (const s of catalog.services) {
      if (s.group !== group) {
        group = s.group
        rows.push({ kind: 'header', label: group, key: `g-${group}` })
      }
      rows.push({ kind: 'service', name: s.name, group: s.group, count: s.plans.length, key: `s-${s.no}` })
    }
  } else {
    let service = -1
    for (const p of results) {
      if (p.serviceNo !== service) {
        service = p.serviceNo
        rows.push({ kind: 'header', label: p.service, key: `h-${p.serviceNo}` })
      }
      rows.push({ kind: 'plan', plan: p, key: p.id })
    }
  }
  const selectable = rows.filter((r) => r.kind !== 'header')
  const show = open && (browsing || results.length > 0)

  function choose(row: Row) {
    if (row.kind === 'service') {
      onChange(row.name)
      setActive(0)
      return
    }
    if (row.kind === 'plan') {
      onPick(row.plan)
      setOpen(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!show) {
      if (e.key === 'ArrowDown') setOpen(true)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = (active + (e.key === 'ArrowDown' ? 1 : -1) + selectable.length) % selectable.length
      setActive(next)
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter' && selectable[active]) {
      e.preventDefault()
      choose(selectable[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  let index = -1
  return (
    <div className="relative">
      <input
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && selectable[active] ? `${listId}-${active}` : undefined}
        className={`input ${invalid ? 'input-error' : ''}`}
        value={value}
        maxLength={50}
        placeholder="서비스 이름으로 검색 (예: 넷플릭스, 쿠팡)"
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {show && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="t-reveal absolute inset-x-0 top-full z-30 mt-1.5 max-h-80 overflow-y-auto rounded-2xl bg-surface p-1.5 shadow-xl ring-1 shadow-black/10 ring-line"
          // 목록을 누르는 동안 입력칸 blur로 닫히지 않게
          onMouseDown={(e) => e.preventDefault()}
        >
          {rows.map((row) => {
            if (row.kind === 'header')
              return (
                <li key={row.key} role="presentation" className="px-2.5 pt-2.5 pb-1 text-xs text-ink-3 first:pt-1">
                  {row.label}
                </li>
              )
            index++
            const i = index
            const isActive = i === active
            return (
              <li
                key={row.key}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={isActive}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 ${isActive ? 'bg-sunken' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(row)}
              >
                {row.kind === 'service' ? (
                  <>
                    <Avatar name={row.name} size={24} />
                    <span className="flex-1 truncate">{row.name}</span>
                    <span className="text-xs text-ink-3">요금제 {row.count}개</span>
                  </>
                ) : (
                  <>
                    <Avatar name={row.plan.service} size={24} />
                    <span className="min-w-0 flex-1">
                      {/* 서비스명은 그룹 제목에 있으니 요금제 이름만 */}
                      <span className="block truncate" title={subscriptionName(row.plan)}>
                        {row.plan.plan}
                      </span>
                      {row.plan.supplemented && <span className="text-xs text-warn-ink">공식 외 출처 보완</span>}
                    </span>
                    <span className="shrink-0 text-xs text-ink-2">{priceLabel(row.plan)}</span>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {!catalog && open && <p className="mt-1.5 text-xs text-ink-3">서비스 목록을 불러오는 중…</p>}
    </div>
  )
}
