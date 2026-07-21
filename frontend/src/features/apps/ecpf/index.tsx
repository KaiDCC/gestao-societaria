// src/pages/ecpfs/index.tsx
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, Plus, Download, ArrowDownUp, ExternalLink, Copy, Check, Eye, EyeOff, Key, Building2, X, ChevronDown, Database, Filter } from "lucide-react";

import { cn } from "@/lib/utils";
import { useEcpfs } from "./hooks";
import { CardsResumo } from "../certificados/components/CardsResumo"; 
import { FiltroDropdown } from "@/components/shared/FiltroDropdown";
import { FiltroMesAno } from "@/components/shared/FiltroMesAno";
import { Pagination } from "@/components/shared/Pagination";
import { api } from "@/lib/api";

import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

import { AdicionarEcpfModal } from "./components/AdicionarEcpfModal";
import { EditarEcpfModal } from "./components/EditarEcpfModal";
import { EcpfsStatusModal } from "./components/EcpfsStatusModal";

export function EcpfsPage() {
  const { allEcpfs, isLoading, filtros, atualizarFiltro, recarregar } = useEcpfs();

  const [statusFiltros, setStatusFiltros] = useState<string[]>([]);
  const [mesAnoFiltro, setMesAnoFiltro] = useState("");
  
  const [isAdicionarModalOpen, setIsAdicionarModalOpen] = useState(false);
  const [ecpfParaEditar, setEcpfParaEditar] = useState<any>(null);
  const [ecpfParaExcluir, setEcpfParaExcluir] = useState<any>(null);
  const [statusModalAberto, setStatusModalAberto] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [empresasModalAberto, setEmpresasModalAberto] = useState<{nome: string, empresas: any[]} | null>(null);

  const [senhasVisiveis, setSenhasVisiveis] = useState<Record<number, boolean>>({});
  const [copiadoId, setCopiadoId] = useState<number | null>(null);

  // Estados para o Dropdown Customizado de Empresas
  const [isComboOpen, setIsComboOpen] = useState(false);
  const [buscaCombo, setBuscaCombo] = useState("");

  // 1. LISTA DO SELECT: Sempre construída a partir da lista COMPLETA
  const empresasParaSelect = useMemo(() => {
    const map = new Map();
    allEcpfs.forEach((cert: any) => {
      if (cert.codi_emp && cert.codi_emp !== 'Todos') {
        map.set(String(cert.codi_emp), { codigo: cert.codi_emp, nome: cert.empresa });
      }
      if (cert.codi_emp === 'Todos' && cert.empresas_vinculadas) {
        cert.empresas_vinculadas.forEach((emp: any) => {
          map.set(String(emp.codigo_empresa), { codigo: emp.codigo_empresa, nome: emp.nome_emp });
        });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => (Number(a.codigo) || 0) - (Number(b.codigo) || 0));
  }, [allEcpfs]);

  // Filtra as opções do dropdown com base no que o usuário digita no combo
  const empresasFiltradasNoCombo = useMemo(() => {
    if (!buscaCombo) return empresasParaSelect;
    const t = buscaCombo.toLowerCase();
    return empresasParaSelect.filter(e => 
      String(e.codigo).includes(t) || e.nome.toLowerCase().includes(t)
    );
  }, [empresasParaSelect, buscaCombo]);

  // Nome da empresa selecionada para exibir no botão
  const empresaSelecionadaNome = useMemo(() => {
    if (!filtros.empresa_vinculada) return "Todas as Empresas";
    const found = empresasParaSelect.find(e => String(e.codigo) === filtros.empresa_vinculada);
    return found ? `${found.codigo} - ${found.nome}` : "Todas as Empresas";
  }, [filtros.empresa_vinculada, empresasParaSelect]);

  // 2. FILTRAGEM DOS DADOS (Acontece em tempo real no Front)
  const ecpfsFiltrados = useMemo(() => {
    let filtered = allEcpfs.filter((cert: any) => {
      if (statusFiltros.length > 0 && !statusFiltros.includes(cert.status)) return false;
      
      if (mesAnoFiltro) {
        if (!cert.validade) return false;
        const valMesAno = cert.validade.substring(0, 7);
        if (valMesAno !== mesAnoFiltro) return false;
      }

      if (filtros.empresa_vinculada) {
        if (cert.codi_emp !== 'Todos') {
          if (String(cert.codi_emp) !== filtros.empresa_vinculada) return false;
        } else {
          const codigosVinculados = cert.empresas_vinculadas?.map((e:any) => String(e.codigo_empresa)) || [];
          if (!codigosVinculados.includes(filtros.empresa_vinculada)) return false;
        }
      }

      return true;
    });

    // Aplica Ordenação
    if (filtros.sort_by === "nome") {
      filtered.sort((a: any, b: any) => String(a.nome_pessoa).localeCompare(String(b.nome_pessoa)));
    } else if (filtros.sort_by === "cpf") {
      filtered.sort((a: any, b: any) => String(a.cpf).localeCompare(String(b.cpf)));
    } else if (filtros.sort_by === "validade") {
      filtered.sort((a: any, b: any) => {
        if (!a.validade || a.validade === 'N/A') return 1;
        if (!b.validade || b.validade === 'N/A') return -1;
        return new Date(a.validade).getTime() - new Date(b.validade).getTime();
      });
    }

    return filtered;
  }, [allEcpfs, statusFiltros, mesAnoFiltro, filtros.empresa_vinculada, filtros.sort_by]);

  // 3. RESUMO DINÂMICO (Atualiza os cards no topo conforme o filtro)
  const resumoDinamico = useMemo(() => {
    return {
      no_prazo: ecpfsFiltrados.filter(e => e.status === "No Prazo").length,
      a_vencer: ecpfsFiltrados.filter(e => e.status === "A Vencer").length,
      vencidos: ecpfsFiltrados.filter(e => e.status === "Vencido").length,
      sem_validade: ecpfsFiltrados.filter(e => e.status === "Sem Validade").length,
      total: ecpfsFiltrados.length
    };
  }, [ecpfsFiltrados]);

  const { statusUnicos } = useMemo(() => {
    const stats = new Set<string>();
    allEcpfs?.forEach((cert: any) => {
      if (cert.status) stats.add(cert.status);
    });
    return { statusUnicos: Array.from(stats).sort() };
  }, [allEcpfs]);

  const toggleSenha = (id: number) => {
    setSenhasVisiveis(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copiarSenha = (id: number, senha?: string) => {
    if (!senha) return;
    const darFeedback = () => {
        setCopiadoId(id);
        setTimeout(() => setCopiadoId(null), 2000);
        toast.success("Senha copiada!");
    };

    const container = document.querySelector('[role="dialog"]') || document.body;
    const textArea = document.createElement("textarea");
    textArea.value = senha;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    textArea.setAttribute("readonly", "");
    container.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand("copy");
    container.removeChild(textArea);
    darFeedback();
  };

  const formatarData = (dataStr: string | null) => {
    if (!dataStr) return 'N/A';
    const partes = dataStr.split(' ')[0].split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataStr;
  };

  const getBadgeStatus = (status: string) => {
    switch (status) {
      case 'No Prazo': return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter cursor-default bg-green-100 text-green-800 border border-[#a8d5b2]">No Prazo</span>;
      case 'A Vencer': return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter cursor-default bg-[#fff3cd] text-[#854d0e] border border-[#e6c76a]">A Vencer</span>;
      case 'Vencido': return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter cursor-default bg-red-100 text-red-800 border border-[#e5aeb3]">Vencido</span>;
      case 'Sem Validade': return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter cursor-default bg-stone-100 text-stone-800 border border-stone-300">Sem Validade</span>;
      default: return <span className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter cursor-default bg-stone-100 text-stone-700 border border-stone-200">{status}</span>;
    }
  };

  // FUNÇÃO DE EXPORTAÇÃO EXCEL DA TELA PRINCIPAL
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(15);

  useEffect(() => {
    setPaginaAtual(1);
  }, [filtros.query, filtros.empresa_vinculada, filtros.sort_by, statusFiltros, mesAnoFiltro]);

  const handleExportarTodosExcel = () => {
    const params = new URLSearchParams();
    params.append("status", "Tudo");
    if (filtros.empresa_vinculada) params.append("empresa_vinculada", filtros.empresa_vinculada);
    window.location.href = `${api.defaults.baseURL || ''}/api/ecpfs/exportar?${params.toString()}`;
  };

  const handleExportarFiltradosExcel = () => {
    const params = new URLSearchParams();
    params.append("status", "Filtrados");
    if (filtros.empresa_vinculada) params.append("empresa_vinculada", filtros.empresa_vinculada);
    if (statusFiltros.length > 0) params.append("status_filtros", statusFiltros.join(","));
    if (mesAnoFiltro) params.append("mes_ano_filtro", mesAnoFiltro);
    window.location.href = `${api.defaults.baseURL || ''}/api/ecpfs/exportar?${params.toString()}`;
  };

  const startIndex = (paginaAtual - 1) * itensPorPagina;
  const endIndex = startIndex + itensPorPagina;
  const ecpfsPaginados = ecpfsFiltrados.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-primary">Certificados Digitais (e-CPF)</h1>
        <p className="text-primary/40 text-xs font-medium">Gestão de certificados de pessoa física</p>
      </div>

      <CardsResumo resumo={resumoDinamico as any} onCardClick={setStatusModalAberto} />

      <div className="bg-white rounded-xl shadow-sm border border-primary/10 flex flex-col">
        <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 h-4 w-4" />
            <Input 
              placeholder="Buscar por nome ou CPF..." 
              className="pl-9 h-10 text-sm bg-primary/5 focus:border-brand border-primary/20" 
              value={filtros.query || ""}
              onChange={(e) => atualizarFiltro('query', e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button className="bg-brand rounded-lg hover:bg-brand-hover text-white font-bold" onClick={() => setIsAdicionarModalOpen(true)}>
              <Plus size={16} className="mr-2" /> Adicionar e-CPF
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
            <div className="relative flex items-center w-full md:w-48">
                <ArrowDownUp className="absolute left-3 text-primary/40 h-3.5 w-3.5 z-10" />
                <select 
                  className="w-full h-9 pl-8 pr-3 appearance-none rounded-md border border-primary/20 text-[11px] font-bold uppercase text-primary/60 bg-white outline-none focus:border-brand cursor-pointer"
                  value={filtros.sort_by || "validade"}
                  onChange={(e) => atualizarFiltro('sort_by', e.target.value)}
                >
                  <option value="validade">Ordem: Validade</option>
                  <option value="nome">Ordem: Nome</option>
                  <option value="cpf">Ordem: CPF</option>
                </select>
            </div>

            <div className="h-5 w-px bg-primary/20 hidden md:block"></div>
            
            <div className="relative w-full md:w-80">
                <div 
                  className={cn(
                    "flex items-center justify-between h-9 px-3 bg-white border rounded-md cursor-pointer transition-all",
                    isComboOpen ? "border-brand ring-1 ring-primary" : "border-primary/20 hover:border-primary/30"
                  )}
                  onClick={() => setIsComboOpen(!isComboOpen)}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Building2 className="text-primary/40 h-3.5 w-3.5 shrink-0" />
                    <span className="text-[11px] font-bold uppercase text-primary/60 truncate">
                      {empresaSelecionadaNome}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {filtros.empresa_vinculada && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          atualizarFiltro('empresa_vinculada', "");
                        }}
                        className="p-0.5 hover:bg-primary/10 rounded-full text-primary/40 hover:text-red-500 transition-colors"
                        title="Limpar filtro"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <ChevronDown className={cn("text-primary/40 h-3.5 w-3.5 transition-transform", isComboOpen && "rotate-180")} />
                  </div>
                </div>

                {isComboOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsComboOpen(false)} />
                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-primary/20 shadow-xl rounded-lg z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-150">
                      <div className="p-2 border-b border-primary/10 bg-primary/5">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-primary/40 h-3 w-3" />
                          <Input 
                            placeholder="Buscar empresa..." 
                            className="h-7 pl-7 text-[11px] bg-white border-primary/20 focus-visible:ring-0"
                            value={buscaCombo}
                            onChange={(e) => setBuscaCombo(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                      </div>
                      
                      <div className="max-h-[190px] overflow-y-auto custom-scrollbar">
                        {empresasFiltradasNoCombo.length > 0 ? (
                          empresasFiltradasNoCombo.map((emp) => (
                            <div 
                              key={emp.codigo}
                              className={cn(
                                "px-3 py-2 text-[11px] font-bold uppercase cursor-pointer hover:bg-primary/5 transition-colors border-b border-primary/10 last:border-0",
                                filtros.empresa_vinculada === String(emp.codigo) ? "text-brand bg-primary/5" : "text-primary/60"
                              )}
                              onClick={() => {
                                atualizarFiltro('empresa_vinculada', String(emp.codigo));
                                setIsComboOpen(false);
                                setBuscaCombo("");
                              }}
                            >
                              <span className="text-primary/90">{String(emp.codigo).padStart(4, '0')}</span> - {emp.nome}
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-[11px] text-primary/40">Nenhuma empresa encontrada</div>
                        )}
                      </div>
                      
                      <button 
                        className="w-full py-2 bg-primary/50 text-[10px] font-bold text-red-500 uppercase hover:bg-red-50 transition-colors border-t border-primary/10"
                        onClick={() => {
                          atualizarFiltro('empresa_vinculada', "");
                          setIsComboOpen(false);
                        }}
                      >
                        {filtros.empresa_vinculada ? "Limpar Filtro (Mostrar Todas)" : "Fechar Lista"}
                      </button>
                    </div>
                  </>
                )}
            </div>

            <div className="h-5 w-px bg-primary/20 hidden md:block"></div>
            <FiltroDropdown label="Status do Cert." options={statusUnicos} selectedValues={statusFiltros} onApply={setStatusFiltros} />
            <div className="h-5 w-px bg-primary/20 hidden md:block"></div>
            <FiltroMesAno value={mesAnoFiltro} onChange={setMesAnoFiltro} />
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white rounded-xl">
        <CardContent className="p-4">
          {isLoading && allEcpfs.length === 0 ? (
             <div className="p-20 text-center flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                <span className="text-primary/50 font-medium text-sm">Carregando e-CPFs...</span>
             </div>
          ) : (
            <>
              <Accordion type="multiple" className="w-full space-y-3">
                {ecpfsPaginados?.map((cert: any) => {
                const isVisible = senhasVisiveis[cert.id];

                return (
                  <AccordionItem key={cert.id} value={`item-${cert.id}`} className="border rounded-xl border-primary/20 overflow-hidden bg-white shadow-sm">
                    <AccordionTrigger className="hover:no-underline py-3 px-4 bg-primary/5 hover:bg-primary/10 transition-colors">
                      <div className="flex items-center gap-2 text-sm text-left font-bold text-primary/90 uppercase">
                        <span>CPF: {cert.cpf}</span>
                        <span className="text-primary/30 font-normal">|</span>
                        <span className="truncate max-w-[300px]">{cert.nome_pessoa}</span>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="p-4 pt-4 bg-white">
                        <div className="flex flex-col md:flex-row justify-between gap-4 mb-5 border-b border-primary/10 pb-5">
                          <div className="flex flex-wrap items-start gap-6">
                            <div>{getBadgeStatus(cert.status)}</div>

                            <div className="flex flex-col">
                              <span className="text-[10px] text-primary/40 font-bold uppercase tracking-tight">Validade</span>
                              <span className="text-sm font-bold text-primary/80">{formatarData(cert.validade)}</span>
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[10px] text-primary/40 font-bold uppercase tracking-tight">Arquivo</span>
                              {cert.arquivo_url ? (
                                <a href={`${api.defaults.baseURL || ''}${cert.arquivo_url}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium">
                                  <ExternalLink size={14} /> Baixar
                                </a>
                              ) : <span className="text-sm text-primary/40">-</span>}
                            </div>

                            <div className="flex flex-col max-w-xs">
                              <span className="text-[10px] text-primary/40 font-bold uppercase tracking-tight">Vínculo Empresarial</span>
                              {cert.codi_emp === 'Todos' ? (
                                <button
                                  type="button"
                                  onClick={() => setEmpresasModalAberto({ nome: cert.nome_pessoa, empresas: cert.empresas_vinculadas })}
                                  className="text-sm text-indigo-600 font-bold hover:text-indigo-800 hover:underline flex items-center gap-1 transition-colors text-left"
                                  title="Clique para ver a lista de empresas"
                                >
                                  <Building2 size={14} /> Múltiplas Empresas ({cert.empresas_vinculadas?.length || 0})
                                </button>
                              ) : (
                                <span className="text-sm font-bold text-primary/70 truncate">
                                  {cert.codi_emp ? `${cert.codi_emp} - ${cert.empresa}` : 'Sem Vínculo'}
                                </span>
                              )}
                            </div>

                            {cert.observacoes && (
                              <div className="flex flex-col max-w-xs">
                                <span className="text-[10px] text-primary/40 font-bold uppercase tracking-tight">Observações</span>
                                <span className="text-sm text-primary/60 truncate">{cert.observacoes}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="sm" className="h-8 px-4 text-xs rounded-lg bg-brand hover:bg-brand-hover text-white font-bold" onClick={() => setEcpfParaEditar(cert)}>
                              Editar
                            </Button>
                            <Button size="sm" className="h-8 px-4 text-xs rounded-lg" variant="destructive" onClick={() => setEcpfParaExcluir(cert)}>
                              Excluir
                            </Button>
                          </div>
                        </div>

                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 inline-flex flex-col md:flex-row md:items-center gap-3">
                          <div className="flex items-center gap-2 text-primary/60 font-bold text-xs uppercase tracking-tight">
                            <Key size={14} className="text-brand" /> Senha do e-CPF:
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Input type={isVisible ? "text" : "password"} value={cert.senha || ""} readOnly className="h-9 w-48 text-sm font-medium bg-white border-primary/30 pr-10 focus-visible:ring-0" />
                              <button type="button" onClick={() => toggleSenha(cert.id)} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary/70">
                                {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                            <Button variant="outline" className={cn("h-9 px-3 font-bold border-primary/30", copiadoId === cert.id ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white hover:bg-primary/5 text-primary/70")} onClick={() => copiarSenha(cert.id, cert.senha)}>
                              {copiadoId === cert.id ? <><Check size={14} className="mr-2 text-emerald-600" /> Copiado!</> : <><Copy size={14} className="mr-2 text-brand" /> Copiar</>}
                            </Button>
                          </div>
                        </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
              
              {ecpfsFiltrados.length === 0 && !isLoading && (
                  <div className="p-10 text-center text-primary/50 text-sm">Nenhum certificado e-CPF encontrado.</div>
                )}
              </Accordion>

              {ecpfsFiltrados.length > 0 && !isLoading && (
                <div className="mt-6">
                  <Pagination
                    totalItems={ecpfsFiltrados.length}
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

      <AlertDialog open={!!ecpfParaExcluir} onOpenChange={(open) => !open && setEcpfParaExcluir(null)}>
        <AlertDialogContent className="bg-white border-primary/20 rounded-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary font-bold text-lg">Excluir e-CPF</AlertDialogTitle>
            <AlertDialogDescription className="text-primary/60 mt-2">
              Deseja excluir o e-CPF de <strong>{ecpfParaExcluir?.nome_pessoa}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold" disabled={isDeleting} onClick={async () => {
                setIsDeleting(true);
                try {
                  await api.delete(`/api/ecpfs/${ecpfParaExcluir.id}`);
                  toast.success("e-CPF excluído!");
                  setEcpfParaExcluir(null);
                  recarregar();
                } catch (error) { toast.error("Erro ao excluir."); } 
                finally { setIsDeleting(false); }
              }}>
              {isDeleting ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!empresasModalAberto} onOpenChange={(open) => !open && setEmpresasModalAberto(null)}>
        <DialogContent className="sm:max-w-[500px] bg-white border-primary/20 rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-primary font-bold text-lg flex items-center gap-2">
              <Building2 className="text-indigo-600" size={20} />
              Empresas Vinculadas
            </DialogTitle>
            <DialogDescription className="text-primary/50">
              O e-CPF de <strong className="text-primary/70">{empresasModalAberto?.nome}</strong> possui vinculo às seguintes empresas:
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-2 mt-4 space-y-2">
            {(empresasModalAberto?.empresas?.length ?? 0) > 0 ? (
              empresasModalAberto?.empresas?.map((emp: any, i: number) => (
                <div key={i} className="p-3 bg-primary/5 border border-primary/10 rounded-lg text-sm text-primary/70 hover:bg-primary/10 transition-colors">
                  <strong className="text-primary/90">{emp.codigo_empresa}</strong> - {emp.nome_emp}
                </div>
              ))
            ) : (
              <p className="text-sm text-primary/50 text-center py-6 bg-primary/5 rounded-lg">
                Nenhuma empresa específica listada na base de dados.
              </p>
            )}
          </div>
          
          <DialogFooter className="mt-2 border-t border-primary/10 pt-4">
            <Button onClick={() => setEmpresasModalAberto(null)} className="bg-primary/20 hover:bg-primary/30 text-primary/80 font-bold w-full sm:w-auto">
              Fechar Lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AdicionarEcpfModal 
        isOpen={isAdicionarModalOpen} 
        onClose={() => setIsAdicionarModalOpen(false)} 
        onSuccess={recarregar} 
      />

      <EditarEcpfModal 
        isOpen={!!ecpfParaEditar} 
        onClose={() => setEcpfParaEditar(null)} 
        onSuccess={recarregar} 
        ecpfOriginal={ecpfParaEditar} 
      />

      <EcpfsStatusModal 
        status={statusModalAberto} 
        empresaVinculada={filtros.empresa_vinculada}
        onClose={() => setStatusModalAberto(null)} 
      />
    </div>
  );
}
