import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

// Reads the resolved theme off <html class> (via MutationObserver) rather than
// the provider's `theme` value directly, since `theme` can be "system" — this
// stays correct whether the user picked light/dark explicitly or is following
// the OS preference (ThemeProvider already keeps the class in sync for both).
export function ThemeToggle() {
  const { setTheme } = useTheme()
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  )

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() =>
      setIsDark(root.classList.contains("dark"))
    )
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
