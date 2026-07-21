// certificados/components/CertificadosStatusModal.tsx
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Loader2, Search } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Pagination } from "@/components/shared/Pagination";
import {TableColumnFilter} from "@/components/shared/TableColumnFilter"

interface CertificadosStatusModalProps {
  status: string | null;
  statusEmpresa: string;
  onClose: () => void;
}

export function CertificadosStatusModal({ status, statusEmpresa, onClose }: CertificadosStatusModalProps) {
  const [certificados, setCertificados] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  
  const [termoBusca, setTermoBusca] = useState("");

  const [filtros, setFiltros] = useState<Record<string, string[]>>({});
  const [ordenacao, setOrdenacao] = useState<{coluna: string, direcao: 'asc' | 'desc'} | null>(null);

  const getCorStatus = (statusNome: string | null) => {
    switch (statusNome) {
      case 'No Prazo': return { border: 'border-emerald-500', text: 'text-emerald-600' };
      case 'A Vencer': return { border: 'border-yellow-500', text: 'text-yellow-600' };
      case 'Vencido': return { border: 'border-red-500', text: 'text-red-600' };
      default: return { border: 'border-stone-200', text: 'text-brand' };
    }
  };

  const cores = getCorStatus(status);

  // Recarrega se o status ou o filtro de empresa mudar
  useEffect(() => {
    if (status) {
      carregarCertificados();
      setPaginaAtual(1);
      setTermoBusca(""); 
      setFiltros({});
      
      if (status === 'A Vencer' || status === 'Vencido') {
        setOrdenacao({ coluna: 'validade', direcao: 'desc' });
      } else {
        setOrdenacao(null);
      }
    } else {
      setCertificados([]);
    }
  }, [status, statusEmpresa]);

  const carregarCertificados = async () => {
    setIsLoading(true);
    try {
      // NOVO: Passa o status_empresa na requisição
      const res = await api.get('/api/certificados/por-status', { 
        params: { status, status_empresa: statusEmpresa } 
      });
      setCertificados(res.data.certificados || res.data || []);
    } catch (error) {
      toast.error(`Erro ao carregar certificados com status: ${status}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportarExcel = () => {
    if (!status) return;
    // NOVO: Passa o status_empresa na URL de exportação
    window.location.href = `${api.defaults.baseURL || ''}/api/certificados/exportar?status=${encodeURIComponent(status)}&status_empresa=${encodeURIComponent(statusEmpresa)}`;
  };

  const formatarData = (dataStr: string | null) => {
    if (!dataStr || dataStr === 'N/A') return 'N/A';
    const partes = dataStr.split(' ')[0].split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataStr;
  };

  const getBadgeStatus = (statusNome: string) => {
    switch (statusNome) {
      case 'No Prazo': 
        return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter cursor-default bg-green-100 text-green-800 border border-[#a8d5b2]">No Prazo</span>;
      case 'A Vencer': 
        return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter cursor-default bg-[#fff3cd] text-[#854d0e] border border-[#e6c76a]">A Vencer</span>;
      case 'Vencido': 
        return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter cursor-default bg-red-100 text-red-800 border border-[#e5aeb3]">Vencido</span>;
      default: 
        return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter cursor-default bg-stone-100 text-stone-700 border border-stone-200">{statusNome}</span>;
    }
  };

  const parseDataBR = (dataStr: string) => {
    if (!dataStr || dataStr === 'N/A' || dataStr === '-') return 0;
    const [dia, mes, ano] = dataStr.split('/');
    return new Date(`${ano}-${mes}-${dia}`).getTime();
  };

  const getOpcoesColuna = (coluna: string) => {
    const valoresUnicos = Array.from(new Set(certificados.map((item: any) => {
      if (coluna === 'validade') return formatarData(item.validade);
      if (coluna === 'empresa') return String(item.empresa_nome || item.razao_social || '-');
      if (coluna === 'codigo') return String(item.codigo_empresa || item.empresa_codigo || '-');
      if (coluna === 'cnpj') return String(item.cnpj || item.empresa_cnpj || '-');
      return String(item[coluna] || '-');
    })));

    return valoresUnicos.sort((a, b) => {
      if (coluna === 'validade') {
        if (a === '-' || a === 'N/A') return a === '-' ? 1 : -1;
        return parseDataBR(b) - parseDataBR(a); 
      }
      return a.localeCompare(b);
    });
  };

  const certificadosProcessados = useMemo(() => {
    let result = certificados;
    
    // 1. Busca Local
    if (termoBusca.trim()) {
      const termo = termoBusca.toLowerCase();
      result = result.filter(c => 
        String(c.codigo_empresa || c.empresa_codigo || '').toLowerCase().includes(termo) ||
        String(c.empresa_nome || c.razao_social || '').toLowerCase().includes(termo) ||
        String(c.cnpj || c.empresa_cnpj || '').toLowerCase().includes(termo) ||
        String(c.observacoes || '').toLowerCase().includes(termo)
      );
    }

    // 2. Filtros de Coluna
    Object.entries(filtros).forEach(([coluna, valoresSelecionados]) => {
      if (valoresSelecionados.length > 0) {
        result = result.filter((item: any) => {
          let val = String(item[coluna] || '-');
          if (coluna === 'validade') val = formatarData(item.validade);
          if (coluna === 'empresa') val = String(item.empresa_nome || item.razao_social || '-');
          if (coluna === 'codigo') val = String(item.codigo_empresa || item.empresa_codigo || '-');
          if (coluna === 'cnpj') val = String(item.cnpj || item.empresa_cnpj || '-');
          return valoresSelecionados.includes(val);
        });
      }
    });

    // 3. Ordenação
    if (ordenacao) {
      result = [...result].sort((a: any, b: any) => {
        let valA = a[ordenacao.coluna] || '';
        let valB = b[ordenacao.coluna] || '';

        if (ordenacao.coluna === 'validade') {
          valA = parseDataBR(formatarData(a.validade));
          valB = parseDataBR(formatarData(b.validade));
          if (valA < valB) return ordenacao.direcao === 'asc' ? -1 : 1;
          if (valA > valB) return ordenacao.direcao === 'asc' ? 1 : -1;
          return 0;
        } 
        
        if (ordenacao.coluna === 'empresa') {
          valA = String(a.empresa_nome || a.razao_social || '').toLowerCase();
          valB = String(b.empresa_nome || b.razao_social || '').toLowerCase();
        } else if (ordenacao.coluna === 'codigo') {
           valA = String(a.codigo_empresa || a.empresa_codigo || '').toLowerCase();
           valB = String(b.codigo_empresa || b.empresa_codigo || '').toLowerCase();
        } else if (ordenacao.coluna === 'cnpj') {
           valA = String(a.cnpj || a.empresa_cnpj || '').toLowerCase();
           valB = String(b.cnpj || b.empresa_cnpj || '').toLowerCase();
        }

        if (valA < valB) return ordenacao.direcao === 'asc' ? -1 : 1;
        if (valA > valB) return ordenacao.direcao === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [certificados, termoBusca, filtros, ordenacao]);

  const startIndex = (paginaAtual - 1) * itensPorPagina;
  const endIndex = startIndex + itensPorPagina;
  const certificadosPaginados = certificadosProcessados.slice(startIndex, endIndex);

  return (
    <Dialog open={!!status} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-[1000px] bg-white border ${cores.border} shadow-2xl rounded-xl p-0 overflow-hidden flex flex-col max-h-[90vh]`}>
        <DialogHeader className="p-4 border-b border-primary/10 bg-primary/5 flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="text-lg font-bold text-primary">
            Certificados com Status: <span className={cores.text}>{status}</span>
          </DialogTitle>
          
          <div className="flex items-center gap-3 mr-8">
            <div className="relative w-80">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/40 h-3.5 w-3.5" />
              <Input 
                placeholder="Buscar por código, empresa, CNPJ ou obs" 
                className="h-8 pl-8 text-xs bg-white border-primary/20 focus:border-brand transition-colors"
                value={termoBusca}
                onChange={(e) => {
                  setTermoBusca(e.target.value);
                  setPaginaAtual(1);
                }}
              />
            </div>

            <Button 
              size="sm" 
              className="bg-[#26764a] hover:bg-[#1c633c] text-white font-bold h-8"
              onClick={handleExportarExcel}
            >
              <Download size={14} className="mr-2" /> Exportar Excel
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
          ) : certificados.length === 0 ? (
            <div className="text-center py-10 text-primary/50 text-sm">
              Nenhum certificado encontrado para o status {status}.
            </div>
          ) : certificadosProcessados.length === 0 ? (
            <div className="text-center py-10 text-primary/50 text-sm">
              Nenhum resultado encontrado com os filtros e busca aplicados.
            </div>
          ) : (
            <div className="overflow-x-auto border border-primary/10 rounded-lg min-h-[350px]">
              <Table className="w-full text-left text-sm">
                <TableHeader className="bg-primary/5">
                  <TableRow className="border-none">
                    <TableHead className="px-4 py-3 min-w-[100px]">
                      <TableColumnFilter title="Cód.Emp" options={getOpcoesColuna('codigo')} selectedValues={filtros['codigo'] || []} onFilterChange={(vals) => setFiltros(prev => ({...prev, codigo: vals}))} onSort={(dir) => setOrdenacao({ coluna: 'codigo', direcao: dir })} currentSort={ordenacao?.coluna === 'codigo' ? ordenacao.direcao : null} />
                    </TableHead>
                    <TableHead className="px-4 py-3 min-w-[200px]">
                      <TableColumnFilter title="Empresa" options={getOpcoesColuna('empresa')} selectedValues={filtros['empresa'] || []} onFilterChange={(vals) => setFiltros(prev => ({...prev, empresa: vals}))} onSort={(dir) => setOrdenacao({ coluna: 'empresa', direcao: dir })} currentSort={ordenacao?.coluna === 'empresa' ? ordenacao.direcao : null} />
                    </TableHead>
                    <TableHead className="px-4 py-3 min-w-[150px]">
                      <TableColumnFilter title="CNPJ" options={getOpcoesColuna('cnpj')} selectedValues={filtros['cnpj'] || []} onFilterChange={(vals) => setFiltros(prev => ({...prev, cnpj: vals}))} onSort={(dir) => setOrdenacao({ coluna: 'cnpj', direcao: dir })} currentSort={ordenacao?.coluna === 'cnpj' ? ordenacao.direcao : null} />
                    </TableHead>
                    <TableHead className="px-4 py-3 min-w-[130px]">
                      <TableColumnFilter title="Validade" options={getOpcoesColuna('validade')} selectedValues={filtros['validade'] || []} onFilterChange={(vals) => setFiltros(prev => ({...prev, validade: vals}))} onSort={(dir) => setOrdenacao({ coluna: 'validade', direcao: dir })} currentSort={ordenacao?.coluna === 'validade' ? ordenacao.direcao : null} />
                    </TableHead>
                    <TableHead className="font-bold text-primary/90 text-[13px] whitespace-nowrap">Status</TableHead>
                    <TableHead className="font-bold text-primary/90 text-[13px]">Obs.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificadosPaginados.map((c, i) => (
                    <TableRow key={c.id || i} className="hover:bg-primary/10 even:bg-slate-50 border-b border-primary/10 transition-colors">
                      <TableCell className="text-xs font-bold whitespace-nowrap text-primary/80">{c.empresa_codigo || c.codigo_empresa}</TableCell>
                      <TableCell className="text-xs font-bold whitespace-nowrap max-w-[250px] truncate text-primary/80" title={c.empresa_nome || c.razao_social}>
                        {c.empresa_nome || c.razao_social}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-primary/80">{c.cnpj || c.empresa_cnpj}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap font-medium text-primary/80">
                        {formatarData(c.validade)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {getBadgeStatus(c.status || status)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-normal min-w-[130px] leading-relaxed text-primary/60">
                        {c.observacoes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {certificadosProcessados.length > itensPorPagina && (
          <div className="p-3 border-t border-primary/10 bg-primary/5 shrink-0">
            <Pagination
              totalItems={certificadosProcessados.length}
              itemsPerPage={itensPorPagina}
              currentPage={paginaAtual}
              onPageChange={setPaginaAtual}
              onItemsPerPageChange={(itens) => {
                setItensPorPagina(itens);
                setPaginaAtual(1);
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
