export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationMeta
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

/**
 * Parse pagination parameters from URL search params.
 * Clamps values to safe defaults.
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const rawPage = parseInt(searchParams.get('page') || '', 10)
  const rawPageSize = parseInt(searchParams.get('pageSize') || '', 10)

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : DEFAULT_PAGE
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize >= 1
      ? Math.min(rawPageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE

  return { page, pageSize }
}

/**
 * Paginate an in-memory array of items.
 */
export function paginateQuery<T>(items: T[], params: PaginationParams): PaginatedResult<T> {
  const { page, pageSize } = params
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(page, totalPages)

  const start = (safePage - 1) * pageSize
  const data = items.slice(start, start + pageSize)

  return {
    data,
    pagination: {
      page: safePage,
      pageSize,
      totalItems,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    },
  }
}

/**
 * Build Prisma-compatible skip/take arguments from pagination params.
 */
export function buildPrismaArgs(params: PaginationParams): { skip: number; take: number } {
  const page = Math.max(1, params.page)
  const take = Math.min(Math.max(1, params.pageSize), MAX_PAGE_SIZE)
  const skip = (page - 1) * take

  return { skip, take }
}

/**
 * Build a PaginationMeta object from a Prisma count + params.
 */
export function buildPaginationMeta(totalItems: number, params: PaginationParams): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / params.pageSize))
  const page = Math.min(Math.max(1, params.page), totalPages)

  return {
    page,
    pageSize: params.pageSize,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}
