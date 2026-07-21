import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown } from "lucide-react";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface MonthYearPickerProps {
  date: { month: number; year: number };
  onSelect: (date: { month: number; year: number }) => void;
  disabled?: boolean;
  showThirteenth?: boolean;
}

export function MonthYearPicker({ date, onSelect, disabled, showThirteenth = false }: MonthYearPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"months" | "years">("months");
  
  const [displayYear, setDisplayYear] = useState(date.year);

  const startYear = Math.floor(displayYear / 10) * 10;
  const years = Array.from({ length: 10 }, (_, i) => startYear + i);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setDisplayYear(date.year);
      setView("months");
    }
    setIsOpen(open);
  };

  const handleMonthSelect = (monthIndex: number) => {
    onSelect({ month: monthIndex + 1, year: displayYear });
    setIsOpen(false); 
  };

  const handleYearSelect = (year: number) => {
    setDisplayYear(year);
    setView("months"); 
  };

  const handlePrevious = () => {
    setDisplayYear((prev) => (view === "months" ? prev - 1 : prev - 10));
  };

  const handleNext = () => {
    setDisplayYear((prev) => (view === "months" ? prev + 1 : prev + 10));
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
        disabled={disabled}
          className="w-[125px] justify-between bg-foreground hover:bg-primary text-white font-quicksand border-0 h-9 px-3"
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {MONTHS[date.month - 1]}/{date.year}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[220px] p-2 border-foreground/20 shadow-md" align="end">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon" onClick={handlePrevious} className="h-7 w-7 text-primary">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            className="h-7 font-semibold text-primary hover:bg-primary/10 text-sm px-2"
            onClick={() => setView(view === "months" ? "years" : "months")}
          >
            {view === "months" ? displayYear : `${startYear} - ${startYear + 9}`}
          </Button>

          <Button variant="ghost" size="icon" onClick={handleNext} className="h-7 w-7 text-[#012952]">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {view === "months" ? (
            MONTHS.map((month, index) => {
              const isSelected = date.month === index + 1 && date.year === displayYear;
              return (
                <Button
                  key={month}
                  variant={isSelected ? "default" : "ghost"}
                  onClick={() => handleMonthSelect(index)}
                  className={`h-8 text-xs font-medium ${
                    isSelected
                      ? "bg-primary hover:bg-primary/90 text-white"
                      : "text-primary hover:bg-primary/10"
                  }`}
                >
                  {month}
                </Button>
              );
            })
          ) : (
            years.map((year) => {
              const isSelected = date.year === year;
              return (
                <Button
                  key={year}
                  variant={isSelected ? "default" : "ghost"}
                  onClick={() => handleYearSelect(year)}
                  className={`h-8 text-xs font-medium ${
                    isSelected
                      ? "bg-primary hover:bg-primary/90 text-white"
                      : "text-primary hover:bg-primary/10"
                  }`}
                >
                  {year}
                </Button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
