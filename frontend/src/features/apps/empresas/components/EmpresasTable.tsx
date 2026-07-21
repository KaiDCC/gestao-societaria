import { useState, useMemo } from "react";
import { Eye, Building2 } from "lucide-react";
import type { Empresa } from "../types";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/shared/Pagination"; 
import { TableColumnFilter } from "@/components/shared/TableColumnFilter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface EmpresasTableProps {
  empresas: Empresa[];
  isLoading: boolean;
}

const formatarDataSimples = (dataString?: string | null) => {
  if (!dataString) return 'N/A';
  const partes = dataString.split(' ')[0].split('-');
  if (partes.length === 3) {
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }
  return dataString;
};

export function EmpresasTable({ empresas, isLoading }: EmpresasTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null);

  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({
    codigo_empresa: [],
    nome_emp: [],
    apel_emp: [],
    cnpj: [],
    stat_emp: []
  });

  const [sortConfig, setSortConfig] = useState<{ key: keyof Empresa | null, direction: 'asc' | 'desc' | null }>({ 
    key: 'codigo_empresa', 
    direction: 'asc' 
  });

  const uniqueValues = useMemo(() => ({
    codigos: Array.from(new Set(empresas.map(e => e.codigo_empresa))).sort(),
    nomes: Array.from(new Set(empresas.map(e => e.nome_emp))).sort(),
    apelidos: Array.from(new Set(empresas.map(e => e.apel_emp))).sort(),
    cnpjs: Array.from(new Set(empresas.map(e => e.cnpj))).sort(),
    status: Array.from(new Set(empresas.map(e => e.stat_emp === 'A' ? 'Ativo' : 'Inativo'))).sort(),
  }), [empresas]);

  const processedEmpresas = useMemo(() => {
    let result = [...empresas];

    Object.keys(columnFilters).forEach(key => {
      const filterValues = columnFilters[key];
      if (filterValues.length > 0) {
        result = result.filter(e => {
          const valorReal = key === 'stat_emp' ? (e.stat_emp === 'A' ? 'Ativo' : 'Inativo') : String(e[key as keyof Empresa]);
          return filterValues.includes(valorReal);
        });
      }
    });

    if (sortConfig.key && sortConfig.direction) {
        result.sort((a, b) => {
            const valA = String(a[sortConfig.key as keyof Empresa] || "");
            const valB = String(b[sortConfig.key as keyof Empresa] || "");

            // ORDENAÇÃO NATURAL: Garante que Cód e CNPJ sigam a ordem numérica correta
            return sortConfig.direction === 'asc'
            ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
            : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
        });
        }

    return result;
  }, [empresas, columnFilters, sortConfig]);

  const paginatedEmpresas = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedEmpresas.slice(startIndex, startIndex + itemsPerPage);
  }, [processedEmpresas, currentPage, itemsPerPage]);

  const handleFilterChange = (key: string, values: string[]) => {
    setColumnFilters(prev => ({ ...prev, [key]: values }));
    setCurrentPage(1);
  };

  const handleSort = (key: keyof Empresa, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction });
  };

  if (isLoading) {
    return <div className="p-6 text-center text-primary/50 text-sm">Carregando empresas...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-primary/20 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table className="w-full text-left text-sm">
          <TableHeader className="bg-primary/5 border-b border-primary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 py-0 px-3 w-16">
                <TableColumnFilter title="Cód" options={uniqueValues.codigos} selectedValues={columnFilters.codigo_empresa} onFilterChange={v => handleFilterChange('codigo_empresa', v)} onSort={d => handleSort('codigo_empresa', d)} currentSort={sortConfig.key === 'codigo_empresa' ? sortConfig.direction : null} />
              </TableHead>
              {/* NOME alterado para RAZÃO SOCIAL */}
              <TableHead className="h-10 py-0 px-3">
                <TableColumnFilter title="Razão Social" options={uniqueValues.nomes} selectedValues={columnFilters.nome_emp} onFilterChange={v => handleFilterChange('nome_emp', v)} onSort={d => handleSort('nome_emp', d)} currentSort={sortConfig.key === 'nome_emp' ? sortConfig.direction : null} />
              </TableHead>
              <TableHead className="h-10 py-0 px-3">
                <TableColumnFilter title="Apelido" options={uniqueValues.apelidos} selectedValues={columnFilters.apel_emp} onFilterChange={v => handleFilterChange('apel_emp', v)} onSort={d => handleSort('apel_emp', d)} currentSort={sortConfig.key === 'apel_emp' ? sortConfig.direction : null} />
              </TableHead>
              <TableHead className="h-10 py-0 px-3 w-40">
                <TableColumnFilter title="CNPJ" options={uniqueValues.cnpjs} selectedValues={columnFilters.cnpj} onFilterChange={v => handleFilterChange('cnpj', v)} onSort={d => handleSort('cnpj', d)} currentSort={sortConfig.key === 'cnpj' ? sortConfig.direction : null} />
              </TableHead>
              <TableHead className="h-10 py-0 px-3 w-28 text-center">
                <TableColumnFilter title="Status" options={uniqueValues.status} selectedValues={columnFilters.stat_emp} onFilterChange={v => handleFilterChange('stat_emp', v)} onSort={d => handleSort('stat_emp', d)} currentSort={sortConfig.key === 'stat_emp' ? sortConfig.direction : null} />
              </TableHead>
              <TableHead className="h-10 py-0 pr-4 text-right font-bold text-primary text-[13px] uppercase tracking-tight">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEmpresas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-4 py-10 text-center text-primary/40 text-xs">Nenhuma empresa encontrada.</TableCell>
              </TableRow>
            ) : (
              paginatedEmpresas.map((emp) => (
                <TableRow 
                  key={emp.id} 
                  className="hover:bg-primary/10 even:bg-slate-50 border-b border-primary/10 transition-colors h-12"
                >
                  <TableCell className="font-bold text-primary/90 text-xs px-3">{emp.codigo_empresa}</TableCell>
                  <TableCell className="font-bold text-primary/90 text-xs px-3 uppercase truncate max-w-[250px]" title={emp.nome_emp}>{emp.nome_emp}</TableCell>
                  <TableCell className="font-bold text-primary/90 text-xs px-3 uppercase truncate max-w-[200px]" title={emp.apel_emp}>{emp.apel_emp}</TableCell>
                  <TableCell className="font-bold text-primary/90 text-xs px-3 whitespace-nowrap">{emp.cnpj}</TableCell>
                  
                  <TableCell className="px-3 py-2 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tighter border",
                      emp.stat_emp === 'A' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                    )}>
                      {emp.stat_emp === 'A' ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right pr-4">
                    <button 
                      onClick={() => setEmpresaSelecionada(emp)}
                      className="p-1.5 text-primary/30 hover:text-brand transition-all"
                    >
                      <Eye size={18} />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-2">
        <Pagination 
          totalItems={processedEmpresas.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      <Dialog open={!!empresaSelecionada} onOpenChange={() => setEmpresaSelecionada(null)}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl bg-white rounded-xl [&>button]:text-white [&>button:hover]:text-primary/30">
          <DialogHeader className="p-6 bg-primary/50 text-primary">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Building2 className="text-brand" size={20} />
              Detalhes da Empresa
            </DialogTitle>
          </DialogHeader>
          
          {empresaSelecionada && (
            <div className="p-6 space-y-5">
              <div className="border-b border-primary/10 pb-3">
                <h4 className="text-base font-bold text-primary/90 leading-tight uppercase">{empresaSelecionada.nome_emp}</h4>
                <p className="text-xs text-primary/40 mt-1 uppercase font-bold">CNPJ: {empresaSelecionada.cnpj}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                <DetailItem label="Insc. Estadual" value={empresaSelecionada.iest_emp} />
                <DetailItem label="Insc. Municipal" value={empresaSelecionada.imun_emp} />
                <DetailItem label="Data Contrato PS" value={formatarDataSimples(empresaSelecionada.dcad_emp)} />
                <DetailItem label="Insc. Junta" value={empresaSelecionada.ijuc_emp} />
                <div className="col-span-2">
                  <DetailItem label="Localização" value={`${empresaSelecionada.cida_emp || 'N/A'} - ${empresaSelecionada.esta_emp || ''}`} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: string | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <label className="text-[10px] font-bold text-primary/40 uppercase tracking-wider">{label}</label>
      <p className="text-sm font-semibold text-primary/70 truncate">{value || 'N/A'}</p>
    </div>
  );
}
