export function getPagination(input: {
  page?: number
  pageSize?: number
}) {
  const page = Math.max(1, input.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 12))

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  }
}

export function buildPageMeta(total: number, page: number, pageSize: number) {
  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize))
  }
}
