// Shared client-side cache for notes list — persists during SPA navigation
// Invalidate this cache from any component to force NoteList to refetch

export interface CategoryRef {
  id: string
  name: string
  color: string
}

export interface CachedNotesResponse {
  notes: Array<{
    id: string
    title: string
    createdAt: string
    updatedAt: string
    categories: CategoryRef[]
  }>
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CachedCategory {
  id: string
  name: string
  color: string
  _count: { notes: number }
}

export const notesCache = new Map<string, CachedNotesResponse>()
export const categoriesCache: { data: CachedCategory[] | null } = { data: null }

export function invalidateNotesCache() {
  notesCache.clear()
  categoriesCache.data = null
}
