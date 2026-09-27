import { useEffect, useState } from 'react'
import type { Catalog } from './catalog'

let cached: Catalog | null = null
let pending: Promise<Catalog> | null = null

export function loadCatalog(): Promise<Catalog> {
  if (cached) return Promise.resolve(cached)
  pending ??= import('./catalogData').then((m) => (cached = m.catalog))
  return pending
}

/** 카탈로그를 처음 쓰는 화면에서 별도 청크로 불러온다. 불러오는 동안은 null */
export function useCatalog(): Catalog | null {
  const [catalog, setCatalog] = useState<Catalog | null>(cached)
  useEffect(() => {
    if (!catalog) loadCatalog().then(setCatalog)
  }, [catalog])
  return catalog
}
