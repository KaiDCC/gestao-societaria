import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, Plus, Download, ArrowDownUp, ExternalLink, Copy, Eye, EyeOff, Key, Check, ChevronDown, Database, Filter } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import { useCertificados } from "./hooks";
import { CardsResumo } from "./components/CardsResumo";
import { FiltroDropdown } from "@/components/shared/FiltroDropdown";
import { FiltroMesAno } from "@/components/shared/FiltroMesAno";
import { Pagination } from "@/components/shared/Pagination";
import { api } from "@/lib/api";

import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

import { AdicionarCertificadoModal } from "./components/AdicionarCertificadoModal";
import { EditarCertificadoModal } from "./components/EditarCertificadoModal";
import { CertificadosStatusModal } from "./components/CertificadosStatusModal";

export function CertificadosPage() {
  const { empresas, resumo, isLoading, filtros, atualizarFiltro, recarregar } = useCertificados();

  const [statusFiltros, setStatusFiltros] = useState<string[]>([]);
  const [mesAnoFiltro, setMesAnoFiltro] = useState("");
  
  const [isAdicionarModalOpen, setIsAdicionarModalOpen] = useState(false);
  const [certificadoParaEditar, setCertificadoParaEditar] = useState<any>(null);
  const [certificadoParaExcluir, setCertificadoParaExcluir] = useState<any>(null);
  const [statusModalAberto, setStatusModalAberto] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [senhasVisiveis, setSenhasVisiveis] = useState<Record<number, boolean>>({});

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(15);

  useEffect(() => {
    setPaginaAtual(1);
  }, [filtros.query, filtros.status_empresa, statusFiltros, mesAnoFiltro]);

  const { statusUnicos } = useMemo(() => {
    const stats = new Set<string>();
    empresas?.forEach((emp: any) => {
      emp.certificados?.forEach((cert: any) => {
        if (cert.status) stats.add(cert.status);
      });
    });
    return { statusUnicos: Array.from(stats).sort() };
  }, [empresas]);

  const empresasFiltradas = useMemo(() => {
    if (!empresas) return [];

    return empresas.map((emp: any) => {
      const certificadosFiltrados = emp.certificados?.filter((cert: any) => {
        if (statusFiltros.length > 0 && !statusFiltros.includes(cert.status)) return false;
        
        if (mesAnoFiltro) {
          if (!cert.validade) return false;
          const valMesAno = cert.validade.substring(0, 7);
          if (valMesAno !== mesAnoFiltro) return false;
        }
        return true;
      }) || [];

      return { ...emp, certificados: certificadosFiltrados };
    }).filter((emp: any) => emp.certificados.length > 0);
  }, [empresas, statusFiltros, mesAnoFiltro]);

  const toggleSenha = (id: number) => {
    setSenhasVisiveis(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [copiadoId, setCopiadoId] = useState<number | null>(null);

  const copiarSenha = (id: number, senha?: string) => {
    if (!senha) {
        toast.error("Não há senha disponível para copiar.");
        return;
    }

    const darFeedback = () => {
        setCopiadoId(id);
        toast.success("Senha copiada!");
        setTimeout(() => setCopiadoId(null), 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(senha)
        .then(darFeedback)
        .catch(() => executarCopiaManual(senha, darFeedback));
    } else {
        executarCopiaManual(senha, darFeedback);
    }
    };

    const executarCopiaManual = (texto: string, callback: () => void) => {
    try {
        const textArea = document.createElement("textarea");
        textArea.value = texto;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const bemSucedido = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (bemSucedido) callback();
    } catch (err) {
        toast.error("Erro ao copiar a senha.");
    }
    };

  const formatarData = (dataStr: string | null) => {
    if (!dataStr) return 'N/A';
    const partes = dataStr.split(' ')[0].split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataStr;
  };

  const getBadgeStatus = (status: string) => {
    switch (status) {
      case 'No Prazo': 
        return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter cursor-default bg-green-100 text-green-800 border border-[#a8d5b2]">No Prazo</span>;
      case 'A Vencer': 
        return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter cursor-default bg-[#fff3cd] text-[#854d0e] border border-[#e6c76a]">A Vencer</span>;
      case 'Vencido': 
        return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter cursor-default bg-red-100 text-red-800 border border-[#e5aeb3]">Vencido</span>;
      case 'Sem Validade': 
        return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter cursor-default bg-stone-100 text-stone-800 border border-stone-300">Sem Validade</span>;
      default: 
        return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter cursor-default bg-stone-100 text-stone-700 border border-stone-200">{status}</span>;
    }
  };

  const handleExportarTodosExcel = () => {
    const params = new URLSearchParams();
    params.append("status", "Tudo");
    if (filtros.query) params.append("query", filtros.query);
    if (filtros.status_empresa) params.append("status_empresa", filtros.status_empresa);
    window.location.href = `${api.defaults.baseURL || ''}/api/certificados/exportar?${params.toString()}`;
  };

  const handleExportarFiltradosExcel = () => {
    const params = new URLSearchParams();
    params.append("status", "Filtrados");
    
    if (filtros.query) params.append("query", filtros.query);
    if (filtros.status_empresa) params.append("status_empresa", filtros.status_empresa);
    if (statusFiltros.length > 0) params.append("status_filtros", statusFiltros.join(","));
    if (mesAnoFiltro) params.append("mes_ano_filtro", mesAnoFiltro);
    
    window.location.href = `${api.defaults.baseURL || ''}/api/certificados/exportar?${params.toString()}`;
  };

  const startIndex = (paginaAtual - 1) * itensPorPagina;
  const endIndex = startIndex + itensPorPagina;
  const empresasPaginadas = empresasFiltradas.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* cabeçalho */}
      <div>
        <h1 className="text-xl font-bold text-primary">Certificados Digitais (e-CNPJ)</h1>
        <p className="text-primary/40 text-xs font-medium">Gestão de arquivos A1 e senhas</p>
      </div>

      <CardsResumo resumo={resumo} onCardClick={setStatusModalAberto} />

      {/* filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-primary/10 flex flex-col">
        <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 h-4 w-4" />
            <Input 
              placeholder="Buscar por código, nome, CNPJ..." 
              className="pl-9 h-10 text-sm bg-primary/5 focus:border-brand border-primary/20" 
              value={filtros.query || ""}
              onChange={(e) => atualizarFiltro('query', e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button 
              className="bg-brand rounded-lg hover:bg-brand-hover text-white font-bold"
              onClick={() => setIsAdicionarModalOpen(true)}
            >
              <Plus size={16} className="mr-2" /> Adicionar Certificado
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-[#26764a] text-white rounded-lg border-[#26764a] hover:bg-[#1d633d] font-bold shadow-sm">
                  <Download size={16} className="mr-2" /> Exportar <ChevronDown size={14} className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-primary/20 rounded-xl shadow-lg p-1">
                <DropdownMenuLabel className="font-bold text-primary/70 text-sm">Exportar Planilha (Excel)</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-primary/10" />
                <DropdownMenuItem onClick={handleExportarTodosExcel} className="cursor-pointer hover:bg-primary/5 text-primary/70 font-medium py-2 px-3 rounded-lg flex items-center">
                  <Database size={16} className="mr-2 text-primary/50" /> Exportar (Tudo)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportarFiltradosExcel} className="cursor-pointer hover:bg-primary/5 text-primary/70 font-medium py-2 px-3 rounded-lg flex items-center">
                  <Filter size={16} className="mr-2 text-primary/50" /> Exportar (Com Filtro)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 p-3 bg-primary/5 border-t border-primary/10 rounded-b-xl">
            {/* 1. ORDENAÇÃO */}
            <div className="relative flex items-center w-full md:w-48">
                <ArrowDownUp className="absolute left-3 text-primary/40 h-3.5 w-3.5 z-10" />
                <select 
                className="w-full h-9 pl-8 pr-3 appearance-none rounded-md border border-primary/20 text-[11px] font-bold uppercase text-primary/60 bg-white outline-none focus:border-brand hover:bg-primary/5 transition-colors cursor-pointer"
                value={filtros.sort_by || "validade"}
                onChange={(e) => atualizarFiltro('sort_by', e.target.value)}
                >
                <option value="validade">Ordem: Validade</option>
                <option value="empresa">Ordem: Empresa</option>
                <option value="codigo">Ordem: Código</option>
                </select>
            </div>

            <div className="w-full md:w-48">
                <select 
                className="w-full h-9 px-3 appearance-none rounded-md border border-primary/20 text-[11px] font-bold uppercase text-primary/60 bg-white outline-none focus:border-brand hover:bg-primary/5 transition-colors cursor-pointer"
                value={filtros.status_empresa || "A"}
                onChange={(e) => atualizarFiltro('status_empresa', e.target.value)}
                >
                <option value="A">Empresas Ativas</option>
                <option value="I">Empresas Inativas</option>
                <option value="todos">Todas Empresas</option>
                </select>
            </div>

            {/* separador | */}
            <div className="h-5 w-px bg-primary/20 hidden md:block"></div>

            <FiltroDropdown 
                label="Status do Cert." 
                options={statusUnicos} 
                selectedValues={statusFiltros} 
                onApply={setStatusFiltros} 
            />

            <div className="h-5 w-px bg-primary/20 hidden md:block"></div>

            <FiltroMesAno value={mesAnoFiltro} onChange={setMesAnoFiltro} />
            </div>
        </div>

      {/* lista */}
      <Card className="border-none shadow-sm bg-white rounded-xl">
        <CardContent className="p-4">
          {isLoading ? (
             <div className="p-10 text-center text-primary/50">Carregando certificados...</div>
          ) : (
            <>
              <Accordion type="multiple" className="w-full space-y-3">
                {empresasPaginadas?.map((empresa: any, index: number) => {
                const cnpj = empresa.certificados?.[0]?.cnpj || empresa.empresa_cnpj || "";
                const uniqueKey = empresa.empresa_codigo || String(index);

                return (
                  <AccordionItem key={uniqueKey} value={`item-${uniqueKey}`} className="border rounded-xl border-primary/20 overflow-hidden bg-white shadow-sm">
                    {/* header */}
                    <AccordionTrigger className="hover:no-underline py-3 px-4 bg-primary/5 hover:bg-primary/10 transition-colors">
                      <div className="flex items-center gap-2 text-sm text-left font-bold text-primary/90 uppercase">
                        <span>Cód: {empresa.empresa_codigo}</span>
                        <span className="text-primary/30 font-normal">|</span>
                        <span>{cnpj}</span>
                        <span className="text-primary/30 font-normal">|</span>
                        <span className="truncate">{empresa.empresa_nome}</span>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="pt-0 pb-0 bg-white">
                      {empresa.certificados?.length > 0 ? (
                        <div className="flex flex-col">
                          {empresa.certificados.map((cert: any, i: number) => {
                            const isVisible = senhasVisiveis[cert.id];

                            return (
                              <div key={cert.id} className={`p-4 ${i !== empresa.certificados.length - 1 ? 'border-b border-primary/10' : ''} hover:bg-primary/5 transition-colors`}>
                                
                                {/* infos */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                  <div className="flex flex-wrap items-center gap-6">
                                    <div>{getBadgeStatus(cert.status)}</div>

                                    <div className="flex flex-col">
                                      <span className="text-[10px] text-primary/40 font-bold uppercase tracking-tight">Validade</span>
                                      <span className="text-sm font-bold text-primary/80">{formatarData(cert.validade)}</span>
                                    </div>

                                    <div className="flex flex-col">
                                      <span className="text-[10px] text-primary/40 font-bold uppercase tracking-tight">Arquivo</span>
                                      {cert.arquivo_url ? (
                                        <a href={`${api.defaults.baseURL || ''}${cert.arquivo_url}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium transition-colors">
                                          <ExternalLink size={14} /> Baixar Arquivo
                                        </a>
                                      ) : (
                                        <span className="text-sm font-medium text-primary/40">-</span>
                                      )}
                                    </div>

                                    {cert.observacoes && (
                                      <div className="flex flex-col">
                                        <span className="text-[10px] text-primary/40 font-bold uppercase tracking-tight">Observações</span>
                                        <TooltipProvider>
                                          <Tooltip delayDuration={200}>
                                            <TooltipTrigger asChild>
                                              <span className="text-sm text-primary/60 max-w-[200px] truncate cursor-help border-b border-dashed border-primary/30">
                                                {cert.observacoes}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="bg-primary text-white border-none shadow-xl max-w-[280px] p-3 z-50">
                                              <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">{cert.observacoes}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button size="sm" className="h-8 px-4 text-xs rounded-lg bg-brand hover:bg-brand-hover text-white font-bold" onClick={() => setCertificadoParaEditar(cert)}>
                                      Editar
                                    </Button>
                                    <Button size="sm" className="h-8 px-4 text-xs rounded-lg" variant="destructive" onClick={() => setCertificadoParaExcluir(cert)}>
                                      Excluir
                                    </Button>
                                  </div>
                                </div>

                                {/* senha */}
                                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 inline-flex flex-col md:flex-row md:items-center gap-3">
                                  <div className="flex items-center gap-2 text-primary/60 font-bold text-xs uppercase tracking-tight">
                                    <Key size={14} className="text-brand" />
                                    Senha do Certificado:
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <div className="relative">
                                      <Input 
                                        type={isVisible ? "text" : "password"} 
                                        value={cert.senha || ""} 
                                        readOnly 
                                        className="h-9 w-48 text-sm font-medium bg-white border-primary/30 pr-10 focus-visible:ring-0 focus-visible:ring-offset-0"
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => toggleSenha(cert.id)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary/70 transition-colors"
                                      >
                                        {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                      </button>
                                    </div>
                                    <Button 
                                    variant="outline" 
                                    className={cn(
                                        "h-9 px-3 transition-all duration-200 font-bold border-primary/30",
                                        copiadoId === cert.id 
                                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 hover:bg-emerald-50" 
                                        : "bg-white hover:bg-primary/5 text-primary/70"
                                    )}
                                    onClick={() => copiarSenha(cert.id, cert.senha)}
                                    >
                                    {copiadoId === cert.id ? (
                                        <>
                                        <Check size={14} className="mr-2 text-emerald-600 animate-in zoom-in duration-300" />
                                        Copiado!
                                        </>
                                    ) : (
                                        <>
                                        <Copy size={14} className="mr-2 text-brand" />
                                        Copiar
                                        </>
                                    )}
                                    </Button>
                                  </div>
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
              
              {empresasFiltradas.length === 0 && !isLoading && (
                  <div className="p-10 text-center text-primary/50 text-sm">
                    Nenhum certificado encontrado com os filtros selecionados.
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

      {/* modais */}
      <AlertDialog open={!!certificadoParaExcluir} onOpenChange={(open) => !open && setCertificadoParaExcluir(null)}>
        <AlertDialogContent className="bg-white border-primary/20 rounded-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary font-bold text-lg">
              Excluir Certificado
            </AlertDialogTitle>
            <AlertDialogDescription className="text-primary/60 mt-2">
              Tem certeza que deseja excluir o certificado da empresa <strong>{certificadoParaExcluir?.empresa_nome || certificadoParaExcluir?.empresa}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeleting} className="h-9 font-bold rounded-md border-primary/20">
              Cancelar
            </AlertDialogCancel>
            <Button 
              className="h-9 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md"
              disabled={isDeleting}
              onClick={async () => {
                if (!certificadoParaExcluir) return;
                setIsDeleting(true);
                try {
                  await api.delete(`/api/certificados/${certificadoParaExcluir.id}`);
                  toast.success("Certificado excluído com sucesso!");
                  setCertificadoParaExcluir(null);
                  recarregar();
                } catch (error: any) {
                  toast.error(error.response?.data?.message || "Erro ao excluir certificado.");
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AdicionarCertificadoModal 
        isOpen={isAdicionarModalOpen} 
        onClose={() => setIsAdicionarModalOpen(false)} 
        onSuccess={() => recarregar()} 
      />
      
      <EditarCertificadoModal 
        isOpen={!!certificadoParaEditar} 
        onClose={() => setCertificadoParaEditar(null)} 
        onSuccess={() => recarregar()} 
        certificadoOriginal={certificadoParaEditar}
      />

      <CertificadosStatusModal
        status={statusModalAberto}
        statusEmpresa={filtros.status_empresa || "A"}
        onClose={() => setStatusModalAberto(null)}
      />

    </div>
  );
}
