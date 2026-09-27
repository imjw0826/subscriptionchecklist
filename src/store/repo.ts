import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppData, TableName } from '../types'
import { createSampleData } from '../data/sample'

type Row = { id: string } & Record<string, unknown>

/** 저장소 추상화: 로컬(localStorage) 또는 Supabase */
export interface Repository {
  kind: 'local' | 'supabase'
  loadAll(): Promise<AppData>
  upsert(table: TableName, rows: Row[]): Promise<void>
  remove(table: TableName, ids: string[]): Promise<void>
}

export const TABLES: TableName[] = ['paymentMethods', 'subscriptions', 'benefits', 'benefitUses', 'usageLogs']

export function emptyData(): AppData {
  return { subscriptions: [], paymentMethods: [], benefits: [], benefitUses: [], usageLogs: [] }
}

// ---------- 로컬 모드 ----------

const LOCAL_KEY = 'subscription-checklist:data'

export function createLocalRepo(): Repository {
  const read = (): AppData => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      if (raw) return { ...emptyData(), ...JSON.parse(raw) }
    } catch {
      /* 저장소 접근 불가 시 샘플로 시작 */
    }
    const sample = createSampleData()
    write(sample)
    return sample
  }
  const write = (data: AppData) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data))
    } catch {
      /* 무시 */
    }
  }
  return {
    kind: 'local',
    async loadAll() {
      return read()
    },
    async upsert(table, rows) {
      const data = read()
      const list = data[table] as unknown as Row[]
      for (const row of rows) {
        const i = list.findIndex((r) => r.id === row.id)
        if (i >= 0) list[i] = row
        else list.push(row)
      }
      write(data)
    },
    async remove(table, ids) {
      const data = read()
      ;(data[table] as unknown as Row[]) = (data[table] as unknown as Row[]).filter((r) => !ids.includes(r.id))
      write(data)
    },
  }
}

// ---------- Supabase ----------

const SQL_TABLE: Record<TableName, string> = {
  subscriptions: 'subscriptions',
  paymentMethods: 'payment_methods',
  benefits: 'benefits',
  benefitUses: 'benefit_uses',
  usageLogs: 'usage_logs',
}

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
const toCamel = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())

function rowToDb(row: Row): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [toSnake(k), v]))
}

function rowFromDb(row: Record<string, unknown>): Row {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k === 'user_id' || k === 'created_at') continue
    out[toCamel(k)] = v
  }
  return out as Row
}

export function createSupabaseRepo(client: SupabaseClient): Repository {
  const check = (error: { message: string } | null) => {
    if (error) throw new Error(error.message)
  }
  return {
    kind: 'supabase',
    async loadAll() {
      const data = emptyData()
      await Promise.all(
        TABLES.map(async (t) => {
          const { data: rows, error } = await client.from(SQL_TABLE[t]).select('*')
          check(error)
          ;(data[t] as unknown as Row[]) = (rows ?? []).map(rowFromDb)
        }),
      )
      return data
    },
    async upsert(table, rows) {
      if (rows.length === 0) return
      const { error } = await client.from(SQL_TABLE[table]).upsert(rows.map(rowToDb))
      check(error)
    },
    async remove(table, ids) {
      if (ids.length === 0) return
      const { error } = await client.from(SQL_TABLE[table]).delete().in('id', ids)
      check(error)
    },
  }
}
