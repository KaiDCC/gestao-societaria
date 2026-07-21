import { api } from "@/lib/api";
import { useState, useEffect, useMemo } from "react";
import { contratosApi } from "../services/contratosApi";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Loader2, FileText, Eye , Trash2} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { TableColumnFilter } from "@/components/shared/TableColumnFilter";
import { Pagination } from "@/components/shared/Pagination";

interface Contrato {
  id: number;
  codigo_empresa: string;
  cnpj: string;
  razao_social: string;
  tipo_contrato: string;
  empresa_contratada?: string;
  created_at: string;
  criado_por_nome?: string;
  socio_administrador: string;
  cpf_socio: string;
  municipio: string;
  uf: string;
  vigencia?: string;
  honorario_mensal?: number;
  regime_tributacao?: string;
  regime_apuracao?: string;
  periodicidade_demonstrativos?: string;
  encerramento_obrigacoes?: string;
  data_assinatura_extenso?: string;
  valor_inadimplencia?: number;
  meses_pendentes?: string;
}

const formatarDataBr = (dataString?: string) => {
  if (!dataString) return '-';
  const apenasData = dataString.split(' ')[0]; 
  const partes = apenasData.split('-');
  if (partes.length === 3) {
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }
  return dataString;
};

export function ListagemTable() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [isDeleting, setIsDeleting] = useState(false);
  const [contratoParaExcluir, setContratoParaExcluir] = useState<number | null>(null);

  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({
    codigo_empresa: [],
    cnpj: [],
    razao_social: [],
    tipo_contrato: [],
    criado_por_nome: [],
    created_at: []
  });

  const [sortConfig, setSortConfig] = useState<{ key: keyof Contrato | null, direction: 'asc' | 'desc' | null }>({ 
    key: null, 
    direction: null 
  });

  useEffect(() => {
    carregarContratos();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, columnFilters]);

  const carregarContratos = async () => {
    try {
      const response = await contratosApi.listarContratos();
      if (response.success) {
        setContratos(response.contratos);
      }
    } catch (error) {
      toast.error("Erro ao carregar a lista de contratos.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExcluir = async () => {
    if (!contratoParaExcluir) return;

    setIsDeleting(true);
    try {
      const response = await contratosApi.excluirContrato(contratoParaExcluir);
      if (response.success) {
        toast.success("Contrato excluído com sucesso!");
        carregarContratos();
      }
    } catch (error:any) {
      toast.error(error.response?.data?.message || "Erro ao excluir o contrato.");
    } finally {
      setIsDeleting(false);
      setContratoParaExcluir(null);
    }
  };

  const handleDownload = async (id: number, formato: 'docx' | 'pdf') => {
    setDownloadingId(`${id}-${formato}`);
    try {
      const response = formato === 'docx' ? await contratosApi.gerarDocx(id) : await contratosApi.gerarPdf(id);
      if (response.success) {
        const urlRelativa = formato === 'docx' ? response.arquivo_docx_url : response.arquivo_pdf_url;
        const fileResponse = await api.get(urlRelativa, { responseType: 'blob' });
        const urlBlob = window.URL.createObjectURL(new Blob([fileResponse.data]));
        const link = document.createElement('a');
        link.href = urlBlob;
        link.setAttribute('download', urlRelativa.split('/').pop() || `contrato.${formato}`); 
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(urlBlob);
        toast.success(`Download do ${formato.toUpperCase()} concluído!`);
      }
    } catch (error) {
      toast.error(`Falha ao baixar o ${formato.toUpperCase()}.`);
    } finally {
      setDownloadingId(null);
    }
  };

  const uniqueValues = useMemo(() => ({
    codigos: Array.from(new Set(contratos.map(c => c.codigo_empresa))).sort(),
    cnpjs: Array.from(new Set(contratos.map(c => c.cnpj))).sort(),
    razoes: Array.from(new Set(contratos.map(c => c.razao_social))).sort(),
    tipos: Array.from(new Set(contratos.map(c => c.tipo_contrato))).sort(),
    usuarios: Array.from(new Set(contratos.map(c => c.criado_por_nome || "Sistema"))).sort(),
    datas: Array.from(new Set(contratos.map(c => formatarDataBr(c.created_at)))).sort(),
  }), [contratos]);

  const processedContratos = useMemo(() => {
    let result = [...contratos];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        (c.razao_social || "").toLowerCase().includes(query) ||
        (c.cnpj || "").includes(query) ||
        (c.codigo_empresa || "").includes(query)
      );
    }

    Object.keys(columnFilters).forEach(key => {
      const filterValues = columnFilters[key];
      if (filterValues.length > 0) {
        result = result.filter(c => {
          const valorReal = key === 'criado_por_nome' ? (c.criado_por_nome || "Sistema") : String(c[key as keyof Contrato]);
          return filterValues.includes(valorReal);
        });
      }
    });

    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        // Tratamento para valores nulos ou campos específicos
        let valA = String(a[sortConfig.key as keyof Contrato] || "");
        let valB = String(b[sortConfig.key as keyof Contrato] || "");
        
        if (sortConfig.key === 'criado_por_nome') {
          valA = a.criado_por_nome || "Sistema";
          valB = b.criado_por_nome || "Sistema";
        }

        // ORDENAÇÃO NATURAL: Resolve o erro do 100 ser menor que 2
        return sortConfig.direction === 'asc'
          ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
          : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    return result;
  }, [contratos, searchQuery, columnFilters, sortConfig]);

  const paginatedContratos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedContratos.slice(startIndex, startIndex + itemsPerPage);
  }, [processedContratos, currentPage, itemsPerPage]);

  const handleFilterChange = (key: string, values: string[]) => {
    setColumnFilters(prev => ({ ...prev, [key]: values }));
  };

  const handleSort = (key: keyof Contrato, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction });
  };

  const getBadgeTipo = (tipo: string) => {
    const baseClass = "px-1.5 py-0.5 rounded text-[13px] font-bold whitespace-nowrap border tracking-tighter";
    switch (tipo) {
      case 'adesao': 
        return <span className={`${baseClass} bg-primary/10 text-primary border-primary/50`}>Adesão</span>;
      case 'distrato': 
        return <span className={`${baseClass} bg-red-50 text-red-700 border-red-200`}>Distrato</span>;
      case 'distrato_inadimplencia': 
        return <span className={`${baseClass} bg-red-100 text-red-800 border-red-300`}>Distrato por Inadimplência</span>;
      default: 
        return <span className={`${baseClass} bg-gray-100 text-gray-700 border-gray-200`}>{tipo}</span>;
    }
  };

  const getBadgeEmpresaContratada = (empresa?: string) => {
  const baseClass =
    "px-1.5 py-0.5 rounded text-[13px] font-bold whitespace-nowrap border tracking-tighter uppercase";

  if (!empresa) {
    return (
      <span
        className={`${baseClass} bg-primary/20 text-primary/70 border-primary/20`}
      >
        -
      </span>
    );
  }

  return (
    <span
      className={`${baseClass} bg-primary/10 text-primary/70 border-primary/30`}
    >
      {empresa}
    </span>
  );
};
  return (
    <Card className="border-none shadow-sm bg-white rounded-xl">
      <CardHeader className="pb-3 pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <CardTitle className="text-base text-primary/90 font-bold">Contratos Gerados</CardTitle>
          <CardDescription className="text-primary/60 text-xs">Histórico de documentos emitidos.</CardDescription>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30 h-3.5 w-3.5" />
          <Input 
            placeholder="Buscar por Cód, CNPJ ou Razão Social" 
            className="pl-9 h-9 text-xs bg-primary/10 border-primary/30 focus:border-brand"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      
      <CardContent className="px-4">
        <div className="rounded-lg border border-primary/20 overflow-hidden">
          <Table className="w-full">
            <TableHeader className="bg-primary/10 border-b border-primary/20 text-primary">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 py-0 px-3 w-16 ">
                  <TableColumnFilter title="Cód" options={uniqueValues.codigos} selectedValues={columnFilters.codigo_empresa} onFilterChange={v => handleFilterChange('codigo_empresa', v)} onSort={d => handleSort('codigo_empresa', d)} currentSort={sortConfig.key === 'codigo_empresa' ? sortConfig.direction : null} />
                </TableHead>
                <TableHead className="h-10 py-0 px-3 w-40">
                  <TableColumnFilter title="CNPJ" options={uniqueValues.cnpjs} selectedValues={columnFilters.cnpj} onFilterChange={v => handleFilterChange('cnpj', v)} onSort={d => handleSort('cnpj', d)} currentSort={sortConfig.key === 'cnpj' ? sortConfig.direction : null} />
                </TableHead>
                <TableHead className="h-10 py-0 px-3">
                  <TableColumnFilter title="Razão Social" options={uniqueValues.razoes} selectedValues={columnFilters.razao_social} onFilterChange={v => handleFilterChange('razao_social', v)} onSort={d => handleSort('razao_social', d)} currentSort={sortConfig.key === 'razao_social' ? sortConfig.direction : null} />
                </TableHead>
                <TableHead className="h-10 py-0 px-3 w-24 text-center">
                  <TableColumnFilter title="Tipo" options={uniqueValues.tipos} selectedValues={columnFilters.tipo_contrato} onFilterChange={v => handleFilterChange('tipo_contrato', v)} onSort={d => handleSort('tipo_contrato', d)} currentSort={sortConfig.key === 'tipo_contrato' ? sortConfig.direction : null} />
                </TableHead>
                <TableHead className="h-10 py-0 px-3 w-28 text-center">
                  <TableColumnFilter title="Criado" options={uniqueValues.datas} selectedValues={columnFilters.created_at} onFilterChange={v => handleFilterChange('created_at', v)} onSort={d => handleSort('created_at', d)} currentSort={sortConfig.key === 'created_at' ? sortConfig.direction : null} />
                </TableHead>
                <TableHead className="h-10 py-0 px-3 w-28">
                  <TableColumnFilter title="Usuário" options={uniqueValues.usuarios} selectedValues={columnFilters.criado_por_nome} onFilterChange={v => handleFilterChange('criado_por_nome', v)} onSort={d => handleSort('criado_por_nome', d)} currentSort={sortConfig.key === 'criado_por_nome' ? sortConfig.direction : null} />
                </TableHead>
                <TableHead className="h-10 py-0 text-right pr-4 font-bold text-primary text-[13px] uppercase tracking-tight">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-20 text-center"><Loader2 className="h-5 w-5 animate-spin text-brand mx-auto" /></TableCell></TableRow>
              ) : processedContratos.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-20 text-center text-primary/40 text-xs">Nenhum contrato encontrado.</TableCell></TableRow>
              ) : (
                paginatedContratos.map((contrato) => (
                  <TableRow key={contrato.id} className="hover:bg-primary/10 transition-colors border-primary/20">
                    <TableCell className="font-bold text-primary/90 text-xs px-3">{contrato.codigo_empresa}</TableCell>
                    <TableCell className="font-bold text-primary/90 text-xs px-3 whitespace-nowrap">{contrato.cnpj}</TableCell>
                    <TableCell className="font-bold text-primary/90 text-xs px-3 max-w-[220px] truncate uppercase" title={contrato.razao_social}>
                      {contrato.razao_social}
                    </TableCell>
                    
                    <TableCell className="px-3 text-center">{getBadgeTipo(contrato.tipo_contrato)}</TableCell>
                    
                    <TableCell className="text-primary/60 font-medium text-[11px] px-3 whitespace-nowrap text-center">
                      {formatarDataBr(contrato.created_at)}
                    </TableCell>
                    <TableCell className="text-primary/60 font-medium text-[11px] px-3 truncate max-w-[100px]">
                      {contrato.criado_por_nome || "Sistema"}
                    </TableCell>
                    
                    <TableCell className="text-right pr-4 px-3">
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex flex-col gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary/40 hover:text-brand"
                            onClick={() => setSelectedContrato(contrato)}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary/40 hover:text-red-500 hover:bg-red-50"
                            onClick={() => setContratoParaExcluir(contrato.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 w-[75px] text-[9px] bg-cyan-50/50 text-cyan-700 border-cyan-100 hover:bg-cyan-100 font-black gap-1"
                            onClick={() => handleDownload(contrato.id, 'docx')}
                            disabled={downloadingId === `${contrato.id}-docx`}
                          >
                            {downloadingId === `${contrato.id}-docx` ? <Loader2 size={10} className="animate-spin" /> : <FileText size={10} />} DOCX
                          </Button>
                          {/*<Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 w-[75px] text-[9px] bg-red-50/50 text-red-700 border-red-100 hover:bg-red-100 font-black gap-1"
                            onClick={() => handleDownload(contrato.id, 'pdf')}
                            disabled={downloadingId === `${contrato.id}-pdf`}
                          >
                            {downloadingId === `${contrato.id}-pdf` ? <Loader2 size={10} className="animate-spin" /> : <FileText size={10} />} PDF
                          </Button> */}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-2">
          <Pagination 
            totalItems={processedContratos.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
          />
        </div>
      </CardContent>

      <Dialog open={!!selectedContrato} onOpenChange={(open) => !open && setSelectedContrato(null)}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-primary border-l-4 border-brand pl-2">
              Detalhes do Contrato
            </DialogTitle>
          </DialogHeader>
          
          {selectedContrato && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div className="col-span-2 bg-primary/10 p-3 rounded-lg border border-primary/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-primary/60 mb-1">Empresa</p>
                      <p className="font-bold text-primary">{selectedContrato.razao_social}</p>
                      <p className="text-primary/60">{selectedContrato.cnpj}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-primary/60 mb-1">Criado por</p>
                      <p className="font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-md inline-block">
                        {selectedContrato.criado_por_nome || 'Sistema'}
                      </p>
                    </div>
                  </div>
                </div>

                <div><p className="text-primary/60 text-xs">Sócio</p><p className="font-bold text-primary/70 truncate" title={selectedContrato.socio_administrador}>{selectedContrato.socio_administrador}</p></div>
                <div><p className="text-primary/60 text-xs">CPF</p><p className="font-bold text-primary/70">{selectedContrato.cpf_socio}</p></div>
                <div><p className="text-primary/60 text-xs">Município/UF</p><p className="font-bold text-primary/70">{selectedContrato.municipio} - {selectedContrato.uf}</p></div>
                <div><p className="text-primary/60 text-xs">Tipo Gerado</p><div>{getBadgeTipo(selectedContrato.tipo_contrato)}</div></div>
                
                <div className="col-span-2"><p className="text-primary/60 text-xs">Empresa Assessoria</p><div>{getBadgeEmpresaContratada(selectedContrato.empresa_contratada)}</div></div>
                <div className="col-span-2 my-1 border-t border-primary/20"></div>

                {selectedContrato.tipo_contrato === 'adesao' && (
                  <>
                    <div><p className="text-primary/60 text-xs">Vigência</p><p className="font-bold text-primary/70">{formatarDataBr(selectedContrato.vigencia)}</p></div>
                    <div><p className="text-primary/60 text-xs">Honorário</p><p className="font-bold text-primary/70">R$ {selectedContrato.honorario_mensal?.toFixed(2).replace('.', ',') || '-'}</p></div>
                    <div className="col-span-2"><p className="text-primary/50 text-xs">Regime de Tributação</p><p className="font-bold text-primary/70">{selectedContrato.regime_tributacao || '-'}</p></div>
                    <div><p className="text-primary/60 text-xs">Apuração</p><p className="font-bold text-primary/70">{selectedContrato.regime_apuracao || '-'}</p></div>
                    <div><p className="text-primary/60 text-xs">Periodicidade</p><p className="font-bold text-primary/70">{selectedContrato.periodicidade_demonstrativos || '-'}</p></div>
                  </>
                )}

                {(selectedContrato.tipo_contrato === 'distrato' || selectedContrato.tipo_contrato === 'distrato_inadimplencia') && (
                  <>
                    <div><p className="text-primary/60 text-xs">Encerramento</p><p className="font-bold text-primary/70">{formatarDataBr(selectedContrato.encerramento_obrigacoes)}</p></div>
                    <div className="col-span-2 bg-primary/10 p-2 rounded border border-primary/20"><p className="text-primary/60 text-xs mb-1">Assinatura no Documento (Extenso)</p><p className="font-bold text-primary/70 text-xs italic">{selectedContrato.data_assinatura_extenso || '-'}</p></div>
                  </>
                )}

                {selectedContrato.tipo_contrato === 'distrato_inadimplencia' && (
                  <>
                    <div className="col-span-2 my-1 border-t border-primary/20"></div>
                    <div><p className="text-primary/60 text-xs">Valor Inadimplência</p><p className="font-bold text-red-600">R$ {selectedContrato.valor_inadimplencia?.toFixed(2).replace('.', ',') || '-'}</p></div>
                    <div className="col-span-2">
                      <p className="text-primary/60 text-xs mb-1">Meses Pendentes</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedContrato.meses_pendentes 
                          ? JSON.parse(selectedContrato.meses_pendentes).map((mes: string) => (
                              <span key={mes} className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-xs font-bold">{mes}</span>
                            ))
                          : <span className="text-primary/40 font-bold">-</span>
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!contratoParaExcluir} onOpenChange={(open) => !open && setContratoParaExcluir(null)}>
        <AlertDialogContent className="bg-white border-primary/30 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription className="text-primary/60">
              Esta ação não pode ser desfeita. Serão excluidos permanentemente os arquivos de (DOCX e PDF).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="bg-white hover:bg-primary/20 border-primary/30 text-primary/70">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault(); 
                handleExcluir();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white border-none shadow-sm"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Excluir Contrato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
