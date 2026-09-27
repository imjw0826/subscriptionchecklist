import md from '../data/catalog.md?raw'
import { parseCatalog } from './catalog'

/** 파싱된 카탈로그. 약 200KB라 useCatalog()로 필요할 때만 불러온다 */
export const catalog = parseCatalog(md)
