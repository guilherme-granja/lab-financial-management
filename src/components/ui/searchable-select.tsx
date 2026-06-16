import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export interface SearchableSelectOption {
  value: string
  label: string
  display?: string
  group?: string
}

export interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  className?: string
}

function groupOptions(options: SearchableSelectOption[]): Map<string | undefined, SearchableSelectOption[]> {
  const groups = new Map<string | undefined, SearchableSelectOption[]>()
  for (const option of options) {
    const key = option.group
    const existing = groups.get(key)
    if (existing) {
      existing.push(option)
    } else {
      groups.set(key, [option])
    }
  }
  return groups
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Selecionar...",
  searchPlaceholder = "Buscar...",
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selectedOption = options.find((o) => o.value === value)

  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    const lower = search.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(lower))
  }, [options, search])

  const grouped = React.useMemo(() => groupOptions(filteredOptions), [filteredOptions])

  function handleSelect(selectedValue: string) {
    onValueChange(selectedValue)
    setOpen(false)
    setSearch("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-[#2d3148] bg-[#0f1117] px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="line-clamp-1">
            {selectedOption
              ? (selectedOption.display ?? selectedOption.label)
              : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus() }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
            {Array.from(grouped.entries()).map(([group, groupItems]) =>
              group !== undefined ? (
                <CommandGroup key={group} heading={group}>
                  {groupItems.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={handleSelect}
                    >
                      <span className="flex-1">
                        {option.display ?? option.label}
                      </span>
                      {value === option.value && (
                        <Check className="h-4 w-4 shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <CommandGroup key="__ungrouped__">
                  {groupItems.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={handleSelect}
                    >
                      <span className="flex-1">
                        {option.display ?? option.label}
                      </span>
                      {value === option.value && (
                        <Check className="h-4 w-4 shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
