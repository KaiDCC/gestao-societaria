import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, Filter, Search } from "lucide-react";

interface TableColumnFilterProps {
  title: string;
  options: string[];
  selectedValues: string[];
  onFilterChange: (values: string[]) => void;
  onSort: (direction: 'asc' | 'desc') => void;
  currentSort?: 'asc' | 'desc' | null;
}

export function TableColumnFilter({
  title,
  options,
  selectedValues,
  onFilterChange,
  onSort,
  currentSort
}: TableColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter(opt => 
    String(opt || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer hover:text-brand transition-colors group select-none whitespace-nowrap">

          <span className="text-[13px] font-bold text-primary uppercase tracking-tight">{title}</span>
          <Filter size={13} className={`${selectedValues.length > 0 ? 'text-brand' : 'text-primary/30 group-hover:text-brand'}`} />
          {currentSort === 'asc' && <ArrowUp size={13} className="text-brand" />}
          {currentSort === 'desc' && <ArrowDown size={13} className="text-brand" />}
        </div>
      </PopoverTrigger>
      
      <PopoverContent className="w-64 p-0 rounded-lg shadow-2xl border-primary/20 overflow-hidden bg-white z-[999]" align="start">
        <div className="flex flex-col p-1 border-b border-primary/10">
          <button className="flex items-center w-full px-3 py-2 text-[12px] font-bold text-primary/60 hover:bg-primary/10 hover:text-primary" onClick={() => { onSort('asc'); setIsOpen(false); }}>
            <ArrowUp size={14} className="mr-3 text-primary/40" /> Crescente
          </button>
          <button className="flex items-center w-full px-3 py-2 text-[12px] font-bold text-primary/60 hover:bg-primary/10 hover:text-primary" onClick={() => { onSort('desc'); setIsOpen(false); }}>
            <ArrowDown size={14} className="mr-3 text-primary/40" /> Decrescente
          </button>
        </div>

        <div className="p-2 border-b border-primary/10 bg-primary/5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/40 h-3.5 w-3.5" />
            <Input 
              placeholder="Buscar..." 
              className="h-8 pl-8 text-[12px] bg-white border-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="p-1">
          <button 
            onClick={() => onFilterChange(selectedValues.length === options.length ? [] : [...options])}
            className="w-full py-1.5 text-[11px] text-primary font-bold hover:bg-primary/10 rounded"
          >
            {selectedValues.length === options.length ? "Desmarcar todos" : "Marcar todos"}
          </button>
          
          <div 
            className="max-h-[140px] overflow-y-auto pt-1 custom-scrollbar"
            onWheelCapture={(e) => e.stopPropagation()}
          >
            {filteredOptions.length === 0 ? (
              <div className="text-[11px] text-primary/40 text-center py-4">Nenhum resultado</div>
            ) : (
              filteredOptions.map(option => (
                <label key={option} className="flex items-center gap-3 px-3 py-2 hover:bg-primary/10 cursor-pointer group rounded">
                  <input 
                    type="checkbox" 
                    className="!w-4 !h-4 !min-w-[16px] !min-h-[16px] accent-[#fdc40e] border-primary/30 rounded cursor-pointer shrink-0"
                    checked={selectedValues.includes(option)}
                    onChange={() => {
                      const newValues = selectedValues.includes(option) 
                        ? selectedValues.filter(v => v !== option) 
                        : [...selectedValues, option];
                      onFilterChange(newValues);
                    }}
                  />
                  <span className="text-[12px] font-bold text-primary/60 group-hover:text-primary truncate">{option}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="p-2 border-t border-primary/15 flex gap-2 bg-primary/10">
          <button 
            onClick={() => onFilterChange([])}
            className="flex-1 py-1.5 text-[11px] font-bold text-primary/60 bg-white border border-primary/20 rounded hover:bg-primary/20 transition-colors"
          >
            Limpar
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="flex-1 py-1.5 text-[11px] font-bold text-white bg-primary rounded hover:bg-foreground transition-colors"
          >
            Fechar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
