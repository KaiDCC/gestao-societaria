import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface FiltroMesAnoProps {
  value: string;
  onChange: (value: string) => void;
}

export function FiltroMesAno({ value, onChange }: FiltroMesAnoProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const selectedYear = value ? parseInt(value.split("-")[0]) : currentYear;
  const selectedMonth = value ? parseInt(value.split("-")[1]) : new Date().getMonth() + 1;

  const [displayYear, setDisplayYear] = useState(selectedYear);

  const handleMonthSelect = (monthIndex: number) => {
    const mm = String(monthIndex + 1).padStart(2, '0');
    onChange(`${displayYear}-${mm}`);
    setIsOpen(false);
  };

  const handleLimpar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setDisplayYear(selectedYear);
    }}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={`h-9 border-primary/20 text-primary/60 justify-between gap-2 hover:bg-primary/5 hover:text-brand transition-colors ${value ? 'bg-brand/10 border-brand/50 text-primary/90' : ''}`}
        >
          <div className="flex items-center gap-2">
            <Calendar size={14} className={value ? 'text-brand' : 'text-primary/40'} />
            <span className="font-bold text-[11px] uppercase tracking-tight">
              {value ? `${MONTHS[selectedMonth - 1]}/${selectedYear}` : "Mês de Validade"}
            </span>
          </div>
          <ChevronDown size={14} className="text-primary/40 ml-2" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[240px] p-3 rounded-xl shadow-xl border-primary/20 bg-white" align="start">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={() => setDisplayYear(y => y - 1)} className="h-7 w-7 text-primary/50 hover:text-primary">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold text-primary/70">{displayYear}</span>
          <Button variant="ghost" size="icon" onClick={() => setDisplayYear(y => y + 1)} className="h-7 w-7 text-primary/50 hover:text-primary">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((month, index) => {
            const isSelected = value === `${displayYear}-${String(index + 1).padStart(2, '0')}`;
            return (
              <Button
                key={month}
                variant={isSelected ? "default" : "ghost"}
                onClick={() => handleMonthSelect(index)}
                className={`h-8 text-xs font-bold transition-colors ${
                  isSelected
                    ? "bg-brand text-white hover:bg-brand-hover hover:text-white"
                    : "text-primary/60 hover:bg-primary/10 hover:text-primary"
                }`}
              >
                {month}
              </Button>
            );
          })}
        </div>
        
        {value && (
          <div className="mt-3 pt-3 border-t border-primary/10">
            <Button variant="ghost" className="w-full h-8 text-[11px] font-bold text-primary/50 hover:bg-primary/5" onClick={handleLimpar}>
              Limpar Filtro
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
