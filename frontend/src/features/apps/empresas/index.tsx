import { Search, RefreshCw, Building2, CheckCircle2, Download } from "lucide-react";
import { useEmpresas } from "./hooks";
import { EmpresasTable } from "./components/EmpresasTable";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

const formatarDataSimples = (dataString?: string | null) => {
  if (!dataString) return '';
  const partes = dataString.split(' ')[0].split('-');
  if (partes.length === 3) {
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }
  return dataString;
};

export function EmpresasPage() {
  const { 
    empresas, isLoading, isSyncing, 
    searchTerm, setSearchTerm, 
    statusFilter, setStatusFilter, 
    handleSincronizar 
  } = useEmpresas();

  const handleExportarXlsx = () => {
    if (empresas.length === 0) {
      toast.warning("Não há empresas para exportar.");
      return;
    }

    try {

      const dadosParaExportar = empresas.map(emp => ({
        "Cód": emp.codigo_empresa,
        "Razão Social": emp.nome_emp,
        "Apelido": emp.apel_emp,
        "CNPJ": emp.cnpj,
        "Status": emp.stat_emp === 'A' ? 'Ativo' : 'Inativo',
        "Insc. Estadual": emp.iest_emp || 'N/A',
        "Insc. Municipal": emp.imun_emp || 'N/A',
        "Insc. Junta": emp.ijuc_emp || 'N/A',
        "Município": emp.cida_emp || 'N/A',
        "Estado": emp.esta_emp || 'N/A',
        "Data Contrato PS": formatarDataSimples(emp.dcad_emp)
      }));

      const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas");

      const wscols = [
        { wch: 8 },  { wch: 40 }, { wch: 25 }, { wch: 18 }, { wch: 10 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 8 }, { wch: 15 }
      ];
      worksheet['!cols'] = wscols;

      // 4. Gera o arquivo e inicia o download
      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      XLSX.writeFile(workbook, `empresas_${dataAtual}.xlsx`);
      
      toast.success("Lista exportada em Excel com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar arquivo Excel.");
    }
  };

  return (
    <div className="p-6 max-w-full mx-auto space-y-4">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand/10 rounded-xl text-brand">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">Empresas</h1>
            <p className="text-primary/40 text-xs font-medium">Gestão da base de clientes sincronizada com a Domínio</p>
          </div>
        </div>

        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={handleSincronizar}
                disabled={isSyncing}
                className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                {isSyncing ? "SINCRONIZANDO..." : "SINCRONIZAR COM A DOMÍNIO"}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-primary text-white border-none shadow-xl max-w-[250px] p-3 z-50">
              <p className="text-xs font-medium leading-relaxed">Busca os cadastros recentes na Domínio.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* BLOCO DE FILTROS COM O BOTÃO DE EXPORTAR REPOSICIONADO */}
      <div className="bg-white p-3 rounded-xl border border-primary/20 flex flex-col md:flex-row gap-3 items-center shadow-sm">
        
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 textprimary/30" size={16} />
          <input 
            type="text"
            placeholder="Buscar por código, nome ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-primary/5 border border-primary/10 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>

        {/* Grupo de Ações do lado direito do filtro */}
        <div className="flex items-center gap-3 w-full md:w-auto border-l border-primary/10 pl-3">
          
          {/* Botão de Exportar à esquerda do Select */}
          <button
            onClick={handleExportarXlsx}
            disabled={isLoading || empresas.length === 0}
            className="flex items-center gap-2 bg-[#26764a] hover:bg-[#1d633d] text-white px-3 py-2 rounded-lg font-bold text-xs transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Download size={14} />
            Exportar Lista
          </button>

          <div className="flex items-center gap-2  px-3 py-1 rounded-lg border border-primary/20">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-primary border-none p-0 text-xs font-bold text-primary/70 cursor-pointer outline-none uppercase tracking-tighter"
            >
              <option value="A">Apenas Ativas</option>
              <option value="I">Apenas Inativas</option>
              <option value="todos">Todas</option>
            </select>
          </div>
        </div>
      </div>

      <EmpresasTable empresas={empresas} isLoading={isLoading} />
      
      <div className="text-right text-primary/40 text-[10px] font-bold uppercase tracking-widest pr-2">
        {empresas.length} Empresas na base
      </div>
    </div>
  );
}
