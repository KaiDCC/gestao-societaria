import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

export function Pagination({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  onItemsPerPageChange
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2 py-4 border-t border-primary/10 bg-white">
      {/* Esquerda */}
      <div className="text-sm text-primary/60 font-medium">
        Total de <span className="font-bold text-primary">{totalItems}</span> registro(s).
      </div>

      <div className="flex items-center gap-6">
        {/* Centro */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-primary/60 whitespace-nowrap">Itens por página:</span>
          <select 
            className="h-8 w-16 rounded border border-primary/20 bg-white text-sm font-bold text-primary focus:border-brand focus:outline-none cursor-pointer"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          >
            {[10, 15, 30, 50, 100].map(val => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </div>

        {/* Direita */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 border-primary/20 text-primary/60 hover:bg-primary/5 disabled:opacity-40"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title="Primeira página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 border-primary/20 text-primary/60 hover:bg-primary/5 disabled:opacity-40"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-sm text-primary/60 mx-2">
            Página <span className="font-bold text-primary">{currentPage}</span> de <span className="font-bold text-primary">{totalPages}</span>
          </span>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 border-primary/20 text-primary/60 hover:bg-primary/5 disabled:opacity-40"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 border-primary/20 text-primary/60 hover:bg-primary/5 disabled:opacity-40"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
