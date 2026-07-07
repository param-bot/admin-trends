import { SearchIcon, XIcon } from "lucide-react"
import { useState } from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface AccountIdSwitcherProps {
  value: string
  defaultValue: string
  onChange: (next: string) => void
}

// A dedicated lookup control instead of a bare labeled input — a leading
// icon and a one-click reset to the default account make it read as "search
// for an account" rather than just a text field that happens to hold an id.
export function AccountIdSwitcher({
  value,
  defaultValue,
  onChange,
}: AccountIdSwitcherProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="account-id" className="text-xs text-muted-foreground">
        Account
      </Label>
      <div
        className={cn(
          "flex h-9 w-72 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 shadow-xs transition-[color,box-shadow]",
          focused && "border-ring ring-3 ring-ring/50"
        )}
      >
        <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          id="account-id"
          value={value}
          placeholder="acc_..."
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="min-w-0 flex-1 bg-transparent font-mono text-xs text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground"
        />
        {value !== defaultValue && (
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            aria-label="Reset to default account"
            title="Reset to default account"
            className="flex shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
