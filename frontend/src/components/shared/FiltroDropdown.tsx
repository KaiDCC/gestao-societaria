import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter, Search, ChevronDown } from "lucide-react";

interface FiltroDropdownProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onApply: (values: string[]) => void;
}

export function FiltroDropdown({ label, options, selectedValues, onApply }: FiltroDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tempValues, setTempValues] = useState<string[]>(selectedValues);

  useEffect(() => {
    if (isOpen) {
      setTempValues(selectedValues);
      setSearchTerm("");
    }
  }, [isOpen, selectedValues]);

  const filteredOptions = options.filter(opt =>
    String(opt || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAllSelected = tempValues.length === options.length && options.length > 0;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setTempValues([]);
    } else {
      setTempValues([...options]);
    }
  };

  const handleToggle = (opt: string) => {
    setTempValues(prev =>
      prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt]
    );
  };

  const handleLimpar = () => {
    setTempValues([]);
    onApply([]);
    setIsOpen(false);
  };

  const handleSalvar = () => {
    onApply(tempValues);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={`h-9 border-primary/20 text-primary/60 justify-between gap-2 hover:bg-primary/5 hover:text-brand transition-colors ${selectedValues.length > 0 ? 'bg-brand/10 border-brand/50 text-primary/90' : ''}`}
        >
          <div className="flex items-center gap-2">
            <Filter size={14} className={selectedValues.length > 0 ? 'text-brand' : 'text-primary/40'} />
            <span className="font-bold text-[11px] uppercase tracking-tight">{label}</span>
            {selectedValues.length > 0 && (
              <span className="ml-1 bg-brand text-primary text-[10px] px-1.5 py-0.5 rounded-full font-black leading-none">
                {selectedValues.length}
              </span>
            )}
          </div>
          <ChevronDown size={14} className="text-primary/60 ml-2" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-64 p-0 rounded-xl shadow-xl border-primary/20 bg-white" align="start">
        <div className="p-2 border-b border-primary/10 bg-primary/5 rounded-t-xl">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/40 h-3.5 w-3.5" />
            <Input
              placeholder="Buscar..."
              className="h-8 pl-8 text-[12px] bg-white border-primary/20 focus-visible:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Botão de Marcar Todas */}
        {searchTerm === "" && options.length > 0 && (
          <div className="px-3 py-2 border-b border-primary/10 bg-primary/5">
            <label className="flex items-center gap-3 cursor-pointer group rounded-lg">
              <input
                type="checkbox"
                className="!w-4 !h-4 !min-w-[16px] !min-h-[16px] accent-primary border-primary/30 rounded cursor-pointer shrink-0"
                checked={isAllSelected}
                onChange={handleToggleAll}
              />
              <span className="text-[12px] font-bold text-primary/70 group-hover:text-brand transition-colors">Marcar todas</span>
            </label>
          </div>
        )}

        <div className="max-h-[136px] overflow-y-auto p-1 custom-scrollbar">
          {filteredOptions.length === 0 ? (
            <div className="text-[11px] text-primary/70 text-center py-4 font-medium">Nenhum resultado</div>
          ) : (
            filteredOptions.map(option => (
              <label key={option} className="flex items-center gap-3 px-3 py-2 hover:bg-primary/5 cursor-pointer group rounded-lg transition-colors">
                <input
                  type="checkbox"
                  className="!w-4 !h-4 !min-w-[16px] !min-h-[16px] accent-primary border-primary/30 rounded cursor-pointer shrink-0"
                  checked={tempValues.includes(option)}
                  onChange={() => handleToggle(option)}
                />
                <span className="text-[12px] font-bold text-primary/60 group-hover:text-primary truncate">{option}</span>
              </label>
            ))
          )}
        </div>

        <div className="p-2 border-t border-primary/10 bg-primary/5 flex gap-2 rounded-b-xl overflow-hidden">
          <Button 
            variant="outline" 
            className="flex-1 h-9 text-[11px] font-bold text-primary/60 border-primary/20 hover:bg-white" 
            onClick={handleLimpar}
          >
            Limpar
          </Button>
          <Button 
            className="flex-1 h-9 text-[11px] font-bold bg-brand hover:bg-brand-hover text-white" 
            onClick={handleSalvar}
          >
            Salvar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
