import {
  CheckIcon,
  ChevronsUpDownIcon,
  Loader2Icon,
  SearchIcon,
} from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string | null
  onValueChange: (value: string | null) => void
  options: SearchableSelectOption[]
  searchValue: string
  onSearchValueChange: (search: string) => void
  onLoadMore?: () => void
  hasMore?: boolean
  isLoading?: boolean
  isLoadingMore?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  allowClear?: boolean
  clearLabel?: string
  triggerClassName?: string
  disabled?: boolean
}

// Generic async combobox: search (server-side, via onSearchValueChange) +
// infinite scroll (via onLoadMore) over whatever `options` the caller feeds
// it — this component owns none of the data fetching, so it works for any
// paginated/searchable list, not just providers. Built directly on Popover,
// not a modified copy of components/ui/select.tsx (that one's for small
// fixed option lists, e.g. interval/currency — this is for large/remote ones).
export function SearchableSelect({
  value,
  onValueChange,
  options,
  searchValue,
  onSearchValueChange,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  isLoadingMore = false,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results",
  allowClear = false,
  clearLabel = "All",
  triggerClassName,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      onSearchValueChange("")
    }
  }

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || isLoadingMore || !onLoadMore) return
    const target = event.currentTarget
    const distanceFromBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight
    if (distanceFromBottom < 48) {
      onLoadMore()
    }
  }

  // Derived purely from the currently-loaded page(s), no cross-render cache —
  // this project's lint rules (React Compiler-oriented) forbid reading/writing
  // refs during render, which is what a "remember the label after it scrolls
  // out of the loaded options" cache would need. Trade-off: if the selected
  // option isn't in the current `options` (e.g. selected under a search term
  // that's since been cleared, and page 1 without it doesn't include it), the
  // trigger falls back to showing the raw id instead of its name. There's no
  // "fetch by id" endpoint to resolve it properly either way.
  const selectedOption =
    value == null ? null : options.find((option) => option.value === value)
  const triggerText =
    value == null ? placeholder : (selectedOption?.label ?? value)

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn("w-36 justify-between font-normal", triggerClassName)}
        >
          <span
            className={cn("truncate", value == null && "text-muted-foreground")}
          >
            {triggerText}
          </span>
          <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="flex items-center gap-2 border-b border-border px-2">
          <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchValueChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 border-0 px-2 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1" onScroll={handleScroll}>
          {allowClear && (
            <SelectRow
              label={clearLabel}
              selected={value == null}
              onClick={() => {
                onValueChange(null)
                setOpen(false)
              }}
            />
          )}

          {options.map((option) => (
            <SelectRow
              key={option.value}
              label={option.label}
              selected={option.value === value}
              onClick={() => {
                onValueChange(option.value)
                setOpen(false)
              }}
            />
          ))}

          {isLoading && (
            <div className="flex items-center justify-center py-3 text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
            </div>
          )}

          {!isLoading && options.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              {emptyText}
            </p>
          )}

          {isLoadingMore && (
            <div className="flex items-center justify-center py-2 text-muted-foreground">
              <Loader2Icon className="size-3.5 animate-spin" />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function SelectRow({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted"
    >
      <CheckIcon
        className={cn("size-3.5 shrink-0", !selected && "invisible")}
      />
      <span className="truncate">{label}</span>
    </button>
  )
}
