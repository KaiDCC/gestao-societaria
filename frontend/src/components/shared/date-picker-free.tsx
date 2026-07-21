"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

interface DatePickerFreeProps {
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function DatePickerFree({ 
  selectedDate, 
  onDateChange, 
  disabled, 
  placeholder = "Selecionar data" 
}: DatePickerFreeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
    onDateChange(date);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col w-full">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={`date-picker-trigger h-9 border-primary/30 shadow-none hover:bg-primary/5 justify-start text-left font-normal ${!selectedDate && "text-muted-foreground"}`}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-primary/40" />
            {selectedDate ? (
              <span className="font-bold text-primary">
                {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
              </span>
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-lg border-primary/20 shadow-xl" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            defaultMonth={selectedDate || new Date()}
            locale={ptBR}
            className="rounded-lg bg-white p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
