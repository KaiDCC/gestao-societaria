// CALENDARIO DE PERÍODO

"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useIsMobile } from "@/hooks/use-mobile";

interface DateRangePickerProps {
  onDateChange: (dataInicio: string, dataFim: string) => void;
  initialRange?: DateRange;
}

export function DateRangePicker({ onDateChange, initialRange }: DateRangePickerProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const [range, setRange] = useState<DateRange | undefined>(
    initialRange || {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date(),
    }
  );
  const [pickerRange, setPickerRange] = useState<DateRange | undefined>(range);
  
  const previousMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const [displayMonth, setDisplayMonth] = useState(previousMonth);

  const handleOpenCalendar = () => {
    setPickerRange(range);
    setIsOpen(true);
  };

  const handleDayClick = (day: Date) => {
    if (pickerRange?.from && pickerRange?.to) {
      setPickerRange({ from: day, to: undefined });
      return;
    }
    if (!pickerRange?.from) {
      setPickerRange({ from: day, to: undefined });
      return;
    }
    if (pickerRange.from && !pickerRange.to) {
      if (day.getTime() === pickerRange.from.getTime()) {
        setPickerRange({ from: pickerRange.from, to: day });
      } else if (day > pickerRange.from) {
        setPickerRange({ from: pickerRange.from, to: day });
      } else {
        setPickerRange({ from: day, to: undefined });
      }
    }
  };

  const handleApplyRange = () => {
    if (pickerRange?.from && pickerRange?.to) {
      const sortedRange = {
        from: pickerRange.from < pickerRange.to ? pickerRange.from : pickerRange.to,
        to: pickerRange.from > pickerRange.to ? pickerRange.from : pickerRange.to,
      };
      setRange(sortedRange);
      
      const inicio = sortedRange.from.toISOString().split("T")[0];
      const fim = sortedRange.to.toISOString().split("T")[0];
      
      onDateChange(inicio, fim);
      setIsOpen(false);
    }
  };

  return (
    <div className="flex flex-col">
      <label className="text-xs text-muted-foreground mb-1">
        Insira o Período
      </label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className="w-[230px] justify-start text-left border-[2px] border-primary"
            onClick={handleOpenCalendar}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {range?.from ? (
              range.to ? (
                <span className="font-bold">
                  {format(range.from, "dd MMM yyyy", { locale: ptBR })} -{" "}
                  {format(range.to, "dd MMM yyyy", { locale: ptBR })}
                </span>
              ) : (
                <span className="font-bold">
                  {format(range.from, "dd MMM yyyy", { locale: ptBR })}
                </span>
              )
            ) : (
              <span>Selecione um período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1" align="end">
          <Calendar
            locale={ptBR}
            mode="range"
            selected={pickerRange}
            onDayClick={handleDayClick}
            initialFocus
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            numberOfMonths={isMobile ? 1 : 2}
            classNames={{
              months: "flex flex-col sm:flex-row sm:space-x-2 sm:space-y-0",
              caption: "flex justify-center pt-1 relative items-center px-8",
              caption_label: "text-[14px] font-bold",
              nav: "flex items-center",
              nav_button_previous: "absolute left-1",
              nav_button_next: " absolute right-1",
              day: "h-5 w-5 text-[12px] p-0",
              head_cell: "h-5 w-5 text-[9.5px] font-medium",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
              day_range_start: "bg-primary text-primary-foreground rounded-l-full",
              day_range_end: "bg-primary text-primary-foreground rounded-r-full",
              day_range_middle: "bg-primary text-primary-foreground rounded-none",
              day_outside: "text-muted-foreground opacity-30",
            }}
          />
          <div className="flex justify-end gap-2 pt-1 border-t pr-2">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Fechar
            </Button>
            <Button size="sm" onClick={handleApplyRange} disabled={!pickerRange?.from || !pickerRange?.to}>
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
