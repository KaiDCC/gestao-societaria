import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, Plus, Download, Settings, ArrowDownUp, ExternalLink, ChevronDown, Database, Filter } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { api } from "@/lib/api";
import { useAlvaras } from "./hooks";
import { TiposAlvaraModal } from "./components/TiposAlvaraModal";
import { CardsResumo } from "./components/CardsResumo";
import { AdicionarAlvaraModal } from "./components/AdicionarAlvaraModal";
import { EditarAlvaraModal } from "./components/EditarAlvaraModal";
import { AlvarasStatusModal } from "./components/AlvarasStatusModal";
import { FiltroDropdown } from "@/components/shared/FiltroDropdown";
import { FiltroMesAno } from "@/components/shared/FiltroMesAno";
import { Pagination } from "@/components/shared/Pagination";

import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";


export function AlvarasPage() {
  const [isTiposModalOpen, setIsTiposModalOpen] = useState(false);
  const { empresas, resumo, isLoading, filtros, atualizarFiltro, recarregar } = useAlvaras();

  const [statusFiltros, setStatusFiltros] = useState<string[]>([]);
  const [responsavelFiltros, setResponsavelFiltros] = useState<string[]>([]);
  const [tipoFiltros, setTipoFiltros] = useState<string[]>([]);
  const [mesAnoFiltro, setMesAnoFiltro] = useState("");
  const [isAdicionarModalOpen, setIsAdicionarModalOpen] = useState(false);

  const [alvaraParaEditar, setAlvaraParaEditar] = useState<any>(null);
  const [alvaraParaExcluir, setAlvaraParaExcluir] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [statusModalAberto, setStatusModalAberto] = useState<string | null>(null);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(15);

  useEffect(() => {
    setPaginaAtual(1);
  }, [filtros.query, statusFiltros, responsavelFiltros, tipoFiltros, mesAnoFiltro]);

  const { tiposUnicos, responsaveisUnicos, statusUnicos } = useMemo(() => {
    const tipos = new Set<string>();
    const resps = new Set<string>();
    const stats = new Set<string>();
    empresas?.forEach((emp: any) => {
      emp.alvaras?.forEach((alv: any) => {
        if (alv.tipo) tipos.add(alv.tipo);
        if (alv.responsavel) resps.add(alv.responsavel);
        if (alv.status) stats.add(alv.status);
      });
    });
    return {
      tiposUnicos: Array.from(tipos).sort(),
      responsaveisUnicos: Array.from(resps).sort(),
      statusUnicos: Array.from(stats).sort()
    };
  }, [empresas]);

  const empresasFiltradas = useMemo(() => {
    if (!empresas) return [];

    return empresas.map((emp: any) => {
      const alvarasFiltrados = emp.alvaras?.filter((alv: any) => {
        if (statusFiltros.length > 0 && !statusFiltros.includes(alv.status)) return false;
        if (responsavelFiltros.length > 0 && !responsavelFiltros.includes(alv.responsavel)) return false;
        if (tipoFiltros.length > 0 && !tipoFiltros.includes(alv.tipo)) return false;
        
        if (mesAnoFiltro) {
          if (!alv.validade) return false;
          const valMesAno = alv.validade.substring(0, 7);
          if (valMesAno !== mesAnoFiltro) return false;
        }
        return true;
      }) || [];

      return { ...emp, alvaras: alvarasFiltrados };
    }).filter((emp: any) => emp.alvaras.length > 0);
  }, [empresas, statusFiltros, responsavelFiltros, tipoFiltros, mesAnoFiltro]);

  const formatarData = (dataStr: string | null) => {
    if (!dataStr) return 'N/A';
    const partes = dataStr.split(' ')[0].split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataStr;
  };

  const getBadgeStatus = (status: string) => {
    switch (status) {
      case 'No Prazo': 
        return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter transition-colors cursor-default bg-green-100 text-green-800 border border-[#a8d5b2] hover:bg-green-200">No Prazo</span>;
      case 'A Vencer': 
        return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter transition-colors cursor-default bg-[#fff3cd] text-[#854d0e] border border-[#e6c76a] hover:bg-yellow-200">A Vencer</span>;
      case 'Vencido': 
        return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter transition-colors cursor-default bg-red-100 text-red-800 border border-[#e5aeb3] hover:bg-red-200">Vencido</span>;
      case 'Sem Validade': 
        return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter transition-colors cursor-default bg-stone-100 text-stone-800 border border-stone-300 hover:bg-stone-200">Sem Validade</span>;
      default: 
        return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter transition-colors cursor-default bg-stone-100 text-stone-700 border border-stone-200">{status}</span>;
    }
  };

  const handleExportarTodosExcel = () => {
    const params = new URLSearchParams();
    params.append("status", "Todos");
    if (filtros.query) params.append("query", filtros.query);
    window.location.href = `${api.defaults.baseURL || ''}/api/alvaras/exportar?${params.toString()}`;
  };

  const handleExportarFiltradosExcel = () => {
    const params = new URLSearchParams();
    params.append("status", "Filtrados");

    if (filtros.query) params.append("query", filtros.query);
    if (statusFiltros.length > 0) params.append("status_filtros", statusFiltros.join(","));
    if (responsavelFiltros.length > 0) params.append("responsavel_filtros", responsavelFiltros.join(","));
    if (tipoFiltros.length > 0) params.append("tipo_filtros", tipoFiltros.join(","));
    if (mesAnoFiltro) params.append("mes_ano_filtro", mesAnoFiltro);

    window.location.href = `${api.defaults.baseURL || ''}/api/alvaras/exportar?${params.toString()}`;
  };


  const startIndex = (paginaAtual - 1) * itensPorPagina;
  const endIndex = startIndex + itensPorPagina;
  const empresasPaginadas = empresasFiltradas.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* cabreçalho */}
      <div>
        <h1 className="text-xl font-bold text-primary">Alvarás</h1>
        <p className="text-primary/40 text-xs font-medium">Gestão e controle de vencimentos</p>
      </div>

      <CardsResumo resumo={resumo} onCardClick={setStatusModalAberto} />

      {/* filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-primary/10 flex flex-col">
        <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 h-4 w-4" />
            <Input 
              placeholder="Busca por empresa.." 
              className="pl-9 h-10 text-sm bg-primary/5 focus:border-brand border-primary/20" 
              value={filtros.query || ""}
              onChange={(e) => atualizarFiltro('query', e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button 
              className="bg-[#a5c4d6] rounded-lg hover:bg-[#06486a] text-white font-bold shadow-sm transition-colors" 
              onClick={() => setIsTiposModalOpen(true)}
            >
              <Settings size={16} className="mr-2 text-brand" /> 
              Gerenciar Tipos
            </Button>
            
            <Button 
              className="bg-brand rounded-lg hover:bg-brand-hover text-white font-bold"
              onClick={() => setIsAdicionarModalOpen(true)}
            >
              <Plus size={16} className="mr-2" /> Adicionar Alvará
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  className="bg-[#26764a] text-white rounded-lg border-[#26764a] hover:bg-[#1d633d] font-bold shadow-sm"
                >
                  <Download size={16} className="mr-2" /> Exportar <ChevronDown size={14} className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-56 bg-white border-primary/20 rounded-xl shadow-lg p-1">
                <DropdownMenuLabel className="font-bold text-sprimary/70 text-sm">
                  Exportar Planilha (Excel)
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator className="bg-primary/10" />
                
                <DropdownMenuItem 
                  onClick={handleExportarTodosExcel} 
                  className="cursor-pointer hover:bg-primary/5 text-primary/70 font-medium py-2 px-3 rounded-lg flex items-center"
                >
                  <Database size={16} className="mr-2 text-primary/50" />
                  Exportar (Tudo)
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={handleExportarFiltradosExcel} 
                  className="cursor-pointer hover:bg-primary/5 text-primary/70 font-medium py-2 px-3 rounded-lg flex items-center"
                >
                  <Filter size={16} className="mr-2 text-primary/50" />
                  Exportar (Com Filtro)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 p-3 bg-primary/5 border-t border-primary/10 rounded-b-xl">
          <div className="relative flex items-center w-full md:w-48">
            <ArrowDownUp className="absolute left-3 text-primary/40 h-3.5 w-3.5 z-10" />
            <select 
              className="w-full h-9 pl-8 pr-3 appearance-none rounded-md border border-primary/20 text-[11px] font-bold uppercase text-primary/60 bg-white outline-none focus:border-brand hover:bg-primary/5 hover:text-brand transition-colors cursor-pointer"
              value={filtros.sort_by || "empresa"}
              onChange={(e) => atualizarFiltro('sort_by', e.target.value)}
            >
              <option value="empresa" className="bg-white text-primary/70 font-bold">Ordem: Empresa</option>
              <option value="codigo" className="bg-white text-primary/70 font-bold">Ordem: Código</option>
              <option value="validade" className="bg-white text-primary/70 font-bold">Ordem: Validade</option>
            </select>
          </div>
          <div className="h-5 w-px bg-primary/20 hidden md:block"></div>
          <FiltroDropdown label="Tipos" options={tiposUnicos} selectedValues={tipoFiltros} onApply={setTipoFiltros} />
          <FiltroDropdown label="Status" options={statusUnicos} selectedValues={statusFiltros} onApply={setStatusFiltros} />
          <FiltroDropdown label="Responsáveis" options={responsaveisUnicos} selectedValues={responsavelFiltros} onApply={setResponsavelFiltros} />
          <div className="h-5 w-px bg-primary/20 hidden md:block"></div>
          <FiltroMesAno value={mesAnoFiltro} onChange={setMesAnoFiltro} />
        </div>
      </div>

      {/* lista */}
      <Card className="border-none shadow-sm bg-white rounded-xl">
        <CardContent className="p-4">
          {isLoading ? (
             <div className="p-10 text-center text-primary/50">Carregando alvarás...</div>
          ) : (
            <>
              <Accordion type="multiple" className="w-full space-y-3">
                {empresasPaginadas?.map((empresa: any, index: number) => {
                  const cnpj = empresa.alvaras?.[0]?.empresa_cnpj || "";
                  const uniqueKey = empresa.empresa_codigo || String(index);

                return (
                  <AccordionItem key={uniqueKey} value={`item-${uniqueKey}`} className="border rounded-xl border-primary/20 overflow-hidden bg-white shadow-sm">
                    <AccordionTrigger className="hover:no-underline py-3 px-4 bg-primary/5 hover:bg-primary/10 transition-colors">
                      <div className="flex items-center gap-2 text-sm text-left font-bold text-primary/90 uppercase">
                        <span>Cód: {empresa.empresa_codigo}</span>
                        <span className="text-primary/30 font-normal">|</span>
                        <span>{cnpj}</span>
                        <span className="text-primary/30 font-normal">|</span>
                        <span className="truncate">{empresa.empresa_nome}</span>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="pt-0 pb-0">
                      {empresa.alvaras?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table className="w-full text-left text-sm">
                            <TableHeader className="bg-white">
                              <TableRow className="border-none hover:bg-transparent">
                                <TableHead className="h-10 py-0 px-4 font-bold text-primary/90 text-[11px] uppercase tracking-tighter">Tipo</TableHead>
                                <TableHead className="h-10 py-0 px-4 font-bold text-primary/90 text-[11px] uppercase tracking-tighter">Responsável</TableHead>
                                <TableHead className="h-10 py-0 px-4 font-bold text-primary/90 text-[11px] uppercase tracking-tighter">Validade</TableHead>
                                <TableHead className="h-10 py-0 px-4 font-bold text-primary/90 text-[11px] uppercase tracking-tighter">Notif.(dias)</TableHead>
                                <TableHead className="h-10 py-0 px-4 font-bold text-primary/90 text-[11px] uppercase tracking-tighter">Status</TableHead>
                                <TableHead className="h-10 py-0 px-4 font-bold text-primary/90 text-[11px] uppercase tracking-tighter">Anexo</TableHead>
                                <TableHead className="h-10 py-0 px-4 font-bold text-primary/90 text-[11px] uppercase tracking-tighter">Obs.</TableHead>
                                <TableHead className="h-10 py-0 px-4 text-right font-bold text-primary/90 text-[11px] uppercase tracking-tighter">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {empresa.alvaras.map((alvara: any) => (
                                <TableRow 
                                  key={alvara.id} 
                                  className="hover:bg-primary/10 even:bg-slate-50 border-b border-primary/10 transition-colors h-14"
                                >
                                  <TableCell className="font-bold text-primary/80 text-xs px-4 uppercase">{alvara.tipo}</TableCell>
                                  <TableCell className="text-primary/60 text-sm px-4">{alvara.responsavel}</TableCell>
                                  <TableCell className="text-primary/80 font-medium text-xs px-4">{formatarData(alvara.validade)}</TableCell>
                                  <TableCell className="text-primary/60 text-xs px-4">{alvara.notificacao_dias}</TableCell>
                                  <TableCell className="px-4">{getBadgeStatus(alvara.status)}</TableCell>
                                  <TableCell className="px-4">
                                    {alvara.anexo_url ? (
                                      <Button 
                                        asChild 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-7 w-14 px-2 text-[10px] font-bold text-primary border-primary/30 hover:bg-primary/5 hover:text-brand rounded-lg transition-colors"
                                      >
                                        <a href={`${api.defaults.baseURL || 'http://localhost:5188'}${alvara.anexo_url}`} target="_blank" rel="noreferrer">
                                          <ExternalLink size={8}  />
                                          Abrir
                                        </a>
                                      </Button>
                                    ) : (
                                      <span className="text-primary/30">-</span>
                                    )}
                                  </TableCell>
                                  
                                  {/* tooltip obs */}
                                  <TableCell className="px-4">
                                    {alvara.observacoes ? (
                                      <TooltipProvider>
                                        <Tooltip delayDuration={200}>
                                          <TooltipTrigger asChild>
                                            <div className="text-primary/50 text-xs max-w-[150px] truncate cursor-help border-b border-dashed border-primary/30 inline-block pb-0.5">
                                              {alvara.observacoes}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="bg-primary text-white border-none shadow-xl max-w-[280px] p-3 z-50">
                                            <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">
                                              <span className="text-white font-bold block mb-1 uppercase tracking-tight">Observações:</span>
                                              {alvara.observacoes}
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ) : (
                                      <span className="text-primary/30">-</span>
                                    )}
                                  </TableCell>

                                  <TableCell className="px-4 text-right align-middle">
                                    <div className="flex flex-col items-end justify-center gap-1.5">
                                      <Button size="sm" className="h-6 w-12 px-3 text-xs rounded-lg bg-brand hover:bg-brand-hover text-white font-bold" onClick={() => setAlvaraParaEditar(alvara)}>
                                        Editar
                                      </Button>
                                      <Button size="sm" className= "h-6 w-12 px-3 text-xs rounded-lg" variant="destructive" onClick={() => setAlvaraParaExcluir(alvara)}>
                                        Excluir
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : null}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
              
              {empresasFiltradas.length === 0 && !isLoading && (
                  <div className="p-10 text-center text-primary/50 text-sm">
                    Nenhum alvará encontrado com os filtros selecionados.
                  </div>
                )}
              </Accordion>

              {empresasFiltradas.length > 0 && !isLoading && (
                <div className="mt-6">
                  <Pagination
                    totalItems={empresasFiltradas.length}
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
            </>
          )}
        </CardContent>
      </Card>

      <TiposAlvaraModal isOpen={isTiposModalOpen} onClose={() => setIsTiposModalOpen(false)} />

      <AdicionarAlvaraModal 
        isOpen={isAdicionarModalOpen} 
        onClose={() => setIsAdicionarModalOpen(false)} 
        onSuccess={recarregar} 
      />

      <EditarAlvaraModal
        isOpen={!!alvaraParaEditar}
        alvaraOriginal={alvaraParaEditar}
        onClose={() => setAlvaraParaEditar(null)}
        onSuccess={recarregar}
      />

      <AlvarasStatusModal 
        status={statusModalAberto} 
        onClose={() => setStatusModalAberto(null)} 
      />

      <AlertDialog open={!!alvaraParaExcluir} onOpenChange={(open) => !open && setAlvaraParaExcluir(null)}>
        <AlertDialogContent className="bg-white border-primary/20 rounded-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary font-bold text-lg">
              Excluir Alvará
            </AlertDialogTitle>
            <AlertDialogDescription className="text-primary/60 mt-2">
              Tem certeza que deseja excluir o Alvará <strong>{alvaraParaExcluir?.tipo}</strong> da empresa <strong>{alvaraParaExcluir?.empresa || alvaraParaExcluir?.empresa_nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-9 bg-red-600 text-white font-bold rounded-md"
              disabled={isDeleting}
              onClick={async () => {
                if (!alvaraParaExcluir) return;
                setIsDeleting(true);
                try {
                  await api.delete(`/api/alvaras/${alvaraParaExcluir.id}`);
                  toast.success("Alvará excluído com sucesso!");
                  setAlvaraParaExcluir(null);
                  recarregar();
                } catch (error: any) {
                  toast.error(error.response?.data?.message || "Erro ao excluir o alvará.");
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
    
  );
}
