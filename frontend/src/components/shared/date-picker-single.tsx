"use client";

import { useState, useEffect } from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";

interface DatePickerSingleProps {
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  disabled?: boolean;
}

export function DatePickerSingle({ selectedDate, onDateChange, disabled }: DatePickerSingleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (selectedDate) {
      setInputValue(format(selectedDate, "dd/MM/yyyy"));
    } else {
      setInputValue("");
    }
  }, [selectedDate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 8) val = val.slice(0, 8);
    
    if (val.length >= 5) {
      val = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
    } else if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    
    setInputValue(val);

    if (val.length === 10) {
      const parsedDate = parse(val, "dd/MM/yyyy", new Date());
      if (isValid(parsedDate)) {
        onDateChange(parsedDate);
      }
    } else if (val.length === 0) {
      onDateChange(undefined);
    }
  };

  const handleSelect = (date: Date | undefined) => {
    onDateChange(date);
    setIsOpen(false);
  };

  return (
    <div className="relative flex items-center">
      <Input
        type="text"
        placeholder="DD/MM/AAAA"
        value={inputValue}
        onChange={handleInputChange}
        disabled={disabled}
        className={`pr-10 h-10 border-primary/30 focus-visible:ring-primary bg-white ${disabled ? 'bg-primary/10 text-primary/40 cursor-not-allowed' : ''}`}
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="absolute right-0 p-2 h-full text-primary/40 hover:text-brand disabled:opacity-50 transition-colors"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white shadow-xl border-primary/20" align="end">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}

            defaultMonth={selectedDate || new Date()} 
            locale={ptBR}
            captionLayout="dropdown" 
            showOutsideDays
            startMonth={new Date(1990, 0)} 
            endMonth={new Date(2050, 11)}
            className="p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
