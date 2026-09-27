export function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString('ko-KR')}원`
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('ko-KR')
}

/** 분 → "3시간 20분" */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}분`
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

export function newId(): string {
  return crypto.randomUUID()
}
