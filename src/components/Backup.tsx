import { useRef, useState } from 'react'
import type { AppData } from '../types'
import { useStore } from '../store/StoreContext'
import { TABLES } from '../store/repo'
import { todayISO } from '../lib/date'
import { useToast } from './Toast'
import { Icon } from './ui'

function isAppData(v: unknown): v is AppData {
  if (!v || typeof v !== 'object') return false
  return TABLES.every((t) => Array.isArray((v as Record<string, unknown>)[t]))
}

/** 전체 데이터 JSON 내보내기·가져오기 */
export default function Backup() {
  const { data, replaceAll } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const toast = useToast()

  function exportJson() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...data }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `subscriptions-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('JSON 파일로 내보냈어요')
  }

  async function importJson(file: File) {
    setMessage(null)
    try {
      const parsed = JSON.parse(await file.text())
      if (!isAppData(parsed)) throw new Error('형식이 올바르지 않은 백업 파일입니다.')
      const next: AppData = {
        subscriptions: parsed.subscriptions,
        paymentMethods: parsed.paymentMethods,
        benefits: parsed.benefits,
        benefitUses: parsed.benefitUses,
        usageLogs: parsed.usageLogs,
      }
      if (!confirm(`구독 ${next.subscriptions.length}개를 포함한 백업으로 현재 데이터를 모두 교체할까요?`)) return
      await replaceAll(next)
      toast('백업을 가져왔어요')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '가져오기 실패')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
      <span className="text-ink-2">데이터 백업</span>
      <button className="btn-ghost py-1.5" onClick={exportJson}>
        <Icon name="download" size={15} />
        JSON 내보내기
      </button>
      <button className="btn-ghost py-1.5" onClick={() => fileRef.current?.click()}>
        <Icon name="upload" size={15} />
        JSON 가져오기
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
      {message && <span className="w-full text-center text-xs text-danger-ink">{message}</span>}
    </div>
  )
}
