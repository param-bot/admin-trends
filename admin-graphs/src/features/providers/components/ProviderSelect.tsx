import { SearchableSelect } from "@/components/ui/searchable-select"
import { useProviderSearch } from "../hooks/use-provider-search"

interface ProviderSelectProps {
  value: string | null
  onChange: (value: string | null) => void
}

export function ProviderSelect({ value, onChange }: ProviderSelectProps) {
  const { search, setSearch, options, isLoading, isLoadingMore, hasMore, loadMore } =
    useProviderSearch()

  return (
    <SearchableSelect
      value={value}
      onValueChange={onChange}
      options={options}
      searchValue={search}
      onSearchValueChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      placeholder="All"
      searchPlaceholder="Search providers…"
      emptyText="No providers found"
      allowClear
      clearLabel="All"
    />
  )
}
