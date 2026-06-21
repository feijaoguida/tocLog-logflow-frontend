"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type DateRangePreset =
  | "today"
  | "last_3_days"
  | "last_7_days"
  | "last_30_days"
  | "current_month"
  | "previous_month"
  | "custom"

export type DatePresetRangeValue = {
  preset: DateRangePreset
  dateFrom: string
  dateTo: string
}

type DatePresetRangeFilterProps = {
  value?: DatePresetRangeValue
  onChange: (value: DatePresetRangeValue) => void
  action?: ReactNode
  className?: string
  presetFieldClassName?: string
  dateFieldClassName?: string
}

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Hoje",
  last_3_days: "Ultimos 3 dias",
  last_7_days: "Ultimos 7 dias",
  last_30_days: "Ultimos 30 dias",
  current_month: "Mes atual",
  previous_month: "Mes passado",
  custom: "Personalizado",
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function atStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function atEndOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function resolvePreset(preset: DateRangePreset): DatePresetRangeValue {
  const today = atStartOfDay(new Date())

  if (preset === "custom") {
    return {
      preset,
      dateFrom: "",
      dateTo: "",
    }
  }

  if (preset === "today") {
    const current = formatDateInput(today)
    return { preset, dateFrom: current, dateTo: current }
  }

  if (preset === "last_3_days" || preset === "last_7_days" || preset === "last_30_days") {
    const size =
      preset === "last_3_days" ? 2 : preset === "last_7_days" ? 6 : 29
    const start = new Date(today)
    start.setDate(today.getDate() - size)
    return {
      preset,
      dateFrom: formatDateInput(start),
      dateTo: formatDateInput(today),
    }
  }

  if (preset === "current_month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    return {
      preset,
      dateFrom: formatDateInput(start),
      dateTo: formatDateInput(today),
    }
  }

  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const previousMonthEnd = atEndOfDay(new Date(today.getFullYear(), today.getMonth(), 0))
  return {
    preset,
    dateFrom: formatDateInput(previousMonthStart),
    dateTo: formatDateInput(previousMonthEnd),
  }
}

export function DatePresetRangeFilter({
  value,
  onChange,
  action,
  className,
  presetFieldClassName,
  dateFieldClassName,
}: DatePresetRangeFilterProps) {
  const [state, setState] = useState<DatePresetRangeValue>(
    value || resolvePreset("current_month"),
  )

  useEffect(() => {
    if (!value) return
    setState(value)
  }, [value])

  useEffect(() => {
    onChange(state)
  }, [onChange, state])

  function handlePresetChange(preset: DateRangePreset) {
    if (preset === "custom") {
      setState((current) => ({ ...current, preset }))
      return
    }

    setState(resolvePreset(preset))
  }

  function handleCustomField(field: "dateFrom" | "dateTo", nextValue: string) {
    setState((current) => ({
      ...current,
      preset: "custom",
      [field]: nextValue,
    }))
  }

  return (
    <div className={cn("app-toolbar flex flex-col gap-3 md:flex-row md:items-end", className)}>
      <div className={cn("field-stack min-w-[220px]", presetFieldClassName)}>
        <Label htmlFor="date-range-preset">Periodo</Label>
        <Select value={state.preset} onValueChange={(nextValue) => handlePresetChange(nextValue as DateRangePreset)}>
          <SelectTrigger id="date-range-preset">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DATE_RANGE_PRESET_LABELS).map(([preset, label]) => (
              <SelectItem key={preset} value={preset}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={cn("field-stack max-w-[180px]", dateFieldClassName)}>
        <Label htmlFor="date-range-from">De</Label>
        <Input
          id="date-range-from"
          type="date"
          value={state.dateFrom}
          disabled={state.preset !== "custom"}
          onChange={(event) => handleCustomField("dateFrom", event.target.value)}
        />
      </div>

      <div className={cn("field-stack max-w-[180px]", dateFieldClassName)}>
        <Label htmlFor="date-range-to">Ate</Label>
        <Input
          id="date-range-to"
          type="date"
          value={state.dateTo}
          disabled={state.preset !== "custom"}
          onChange={(event) => handleCustomField("dateTo", event.target.value)}
        />
      </div>

      {action ? <div className="flex items-end">{action}</div> : null}
    </div>
  )
}
