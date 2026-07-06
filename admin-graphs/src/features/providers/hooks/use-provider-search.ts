import { useInfiniteQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { fetchGameProviders } from "../api"

const PAGE_LIMIT = 15
const SEARCH_DEBOUNCE_MS = 300

// Backs ProviderSelect: debounces the search box into a `name` query param
// (optional — omitted entirely when empty) and pages through results 15 at a
// time via the backend's own hasNextPage flag.
export function useProviderSearch() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)

  const query = useInfiniteQuery({
    queryKey: ["game-providers", debouncedSearch],
    queryFn: ({ pageParam }) =>
      fetchGameProviders({
        page: pageParam,
        limit: PAGE_LIMIT,
        name: debouncedSearch || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.hasMore ? lastPageParam + 1 : undefined,
  })

  const options = useMemo(
    () =>
      (query.data?.pages ?? []).flatMap((page) =>
        page.items.map((provider) => ({
          value: provider.id,
          label: provider.name,
        }))
      ),
    [query.data]
  )

  return {
    search,
    setSearch,
    options,
    isLoading: query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    hasMore: Boolean(query.hasNextPage),
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage()
      }
    },
  }
}
