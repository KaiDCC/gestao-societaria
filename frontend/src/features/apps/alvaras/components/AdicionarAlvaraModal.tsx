import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, FileText, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

import { alvarasApi } from "../services/alvarasApi";
import { api } from "@/lib/api";
import { DatePickerSingle } from "@/components/shared/date-picker-single";

interface AdicionarAlvaraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdicionarAlvaraModal({ isOpen, onClose, onSuccess }: AdicionarAlvaraModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [tipos, setTipos] = useState<any[]>([]);
  const [responsaveis, setResponsaveis] = useState<any[]>([]);

  const [buscaEmpresa, setBuscaEmpresa] = useState("");
  const [empresasEncontradas, setEmpresasEncontradas] = useState<any[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<{id: number, nome: string} | null>(null);

  const [tipo, setTipo] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [validade, setValidade] = useState<Date | undefined>(undefined);
  const [notificacaoDias, setNotificacaoDias] = useState("30");
  const [observacoes, setObservacoes] = useState("");
  const [anexo, setAnexo] = useState<File | null>(null);

  const [dispensada, setDispensada] = useState(false);
  const [indeterminada, setIndeterminada] = useState(false);
  const [arquivado, setArquivado] = useState(false);
  const [emRenovacao, setEmRenovacao] = useState(false);
  const [pendente, setPendente] = useState(false);

  const isValidadeDisabled = dispensada || indeterminada;

  const isFormValid = empresaSelecionada && tipo && responsavel && notificacaoDias && anexo;

  useEffect(() => {
    if (isOpen) {
      limparFormulario();
      carregarListas();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isValidadeDisabled) {
      setValidade(undefined);
    }
  }, [isValidadeDisabled]);

  const limparFormulario = () => {
    setEmpresaSelecionada(null);
    setBuscaEmpresa("");
    setEmpresasEncontradas([]);
    setTipo("");
    setResponsavel("");
    setValidade(undefined);
    setNotificacaoDias("30");
    setObservacoes("");
    setAnexo(null);
    setDispensada(false);
    setIndeterminada(false);
    setArquivado(false);
    setEmRenovacao(false);
    setPendente(false);
  };

  const carregarListas = async () => {
    try {
      const resTipos = await alvarasApi.listarTipos();
      setTipos(resTipos.tipos || resTipos || []);
      try {
        const resResp = await api.get('/api/alvaras/responsaveis');
        setResponsaveis(resResp.data.responsaveis || []);
      } catch (e) {
        console.warn("Rota de responsáveis não encontrada.");
      }
    } catch (error) {
      toast.error("Erro ao carregar opções do formulário.");
    }
  };

  const handleBuscarEmpresa = async (query: string) => {
    setBuscaEmpresa(query);
    setEmpresaSelecionada(null);
    
    if (query.trim().length === 0) {
      setEmpresasEncontradas([]);
      return;
    }
    
    try {
      const response = await api.get(`/api/empresas/buscar`, { params: { query } });
      let resultados = response.data.empresas || [];
      
      const q = query.trim();
      const qNum = Number(q);
      const isSearchNumeric = !isNaN(qNum) && q !== "";

      resultados.sort((a: any, b: any) => {
        const codA = Number(a.codigo_empresa);
        const codB = Number(b.codigo_empresa);
        const nomeA = String(a.nome_emp).toLowerCase();
        const nomeB = String(b.nome_emp).toLowerCase();

        if (isSearchNumeric) {
          if (codA === qNum && codB !== qNum) return -1;
          if (codB === qNum && codA !== qNum) return 1;
          
          return codA - codB;
        }

        const termo = q.toLowerCase();
        if (nomeA.startsWith(termo) && !nomeB.startsWith(termo)) return -1;
        if (nomeB.startsWith(termo) && !nomeA.startsWith(termo)) return 1;

        return nomeA.localeCompare(nomeB);
      });

      setEmpresasEncontradas(resultados);
    } catch (error) {
      console.error("Erro ao buscar empresas", error);
    }
  };

  const selecionarEmpresa = (empresa: any) => {
    setEmpresaSelecionada({ id: empresa.id, nome: `${empresa.codigo_empresa} - ${empresa.nome_emp} (${empresa.cnpj})` });
    setBuscaEmpresa("");
    setEmpresasEncontradas([]);
  };

  const prepararEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsConfirmOpen(true);
  };

  const executarEnvio = async () => {
    setIsConfirmOpen(false);
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("empresa_id", empresaSelecionada!.id.toString());
      formData.append("tipo", tipo);
      formData.append("responsavel_id", responsavel);
      
      if (validade && !isValidadeDisabled) {
        formData.append("validade", format(validade, 'yyyy-MM-dd'));
      }
      
      formData.append("notificacao_dias", notificacaoDias);
      formData.append("observacoes", observacoes);
      formData.append("dispensada", dispensada ? "true" : "false");
      formData.append("indeterminada", indeterminada ? "true" : "false");
      formData.append("arquivado", arquivado ? "true" : "false");
      formData.append("em_renovacao", emRenovacao ? "true" : "false");
      formData.append("pendente", pendente ? "true" : "false");

      if (anexo) {
        formData.append("anexo", anexo);
      }

      await api.post('/api/alvaras', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success("Alvará adicionado com sucesso!");
      onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Erro ao adicionar alvará.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[750px] bg-white border-none shadow-2xl rounded-xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 pb-4 border-b border-primary/10 bg-primary/5 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
              <FileText className="text-brand" size={24} />
              Adicionar Alvará
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={prepararEnvio} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase">Empresa *</label>
              {empresaSelecionada ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    {empresaSelecionada.nome}
                  </span>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-emerald-700 hover:bg-emerald-100" onClick={() => setEmpresaSelecionada(null)}>
                    Trocar
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-primary/40" />
                  <Input 
                    placeholder="Digite código, nome ou CNPJ da empresa..." 
                    value={buscaEmpresa}
                    onChange={(e) => handleBuscarEmpresa(e.target.value)}
                    className="pl-9 h-10 border-primary/30 focus-visible:ring-primary"
                  />
                  {empresasEncontradas.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-primary/20 shadow-xl rounded-lg max-h-48 overflow-y-auto">
                      {empresasEncontradas.map(emp => (
                        <div 
                          key={emp.id} 
                          className="p-3 hover:bg-primary/5 cursor-pointer border-b border-primary/10 last:border-0 text-sm font-medium text-primary/70"
                          onClick={() => selecionarEmpresa(emp)}
                        >
                          <span className="font-bold text-primary/90">{emp.codigo_empresa}</span> - {emp.nome_emp} <span className="text-primary/40 text-xs">({emp.cnpj})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary/60 uppercase">Tipo de Alvará *</label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="w-full h-10 bg-white border-primary/30 focus:ring-primary text-primary/70 font-medium">
                    <SelectValue placeholder="Selecione um tipo" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] bg-white border-primary/20 shadow-xl">
                    {tipos.map(t => <SelectItem key={t.id || t.nome} value={t.nome}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary/60 uppercase">Responsável *</label>
                <Select value={responsavel} onValueChange={setResponsavel}>
                  <SelectTrigger className="w-full h-10 bg-white border-primary/30 focus:ring-primary text-primary/70 font-medium">
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] bg-white border-primary/20 shadow-xl">
                   {responsaveis.map(r => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary/60 uppercase">Validade</label>
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div className="block">
                        <DatePickerSingle 
                          selectedDate={validade} 
                          onDateChange={setValidade} 
                          disabled={isValidadeDisabled}
                        />
                      </div>
                    </TooltipTrigger>
                    {isValidadeDisabled && (
                      <TooltipContent side="top" className="bg-primary text-white border-none font-medium text-xs">
                        Validade inativa para alvará com este status
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary/60 uppercase">Notificar antes de (Dias) *</label>
                <Input 
                  type="number" 
                  min="1"
                  className="h-10 border-primary/30 focus-visible:ring-primary"
                  value={notificacaoDias}
                  onChange={(e) => setNotificacaoDias(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <label className="text-xs font-bold text-primary/60 uppercase block mb-3">Opções e Status</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { id: "dispensada", label: "Dispensada", state: dispensada, set: setDispensada },
                  { id: "indeterminada", label: "Indeterminada", state: indeterminada, set: setIndeterminada },
                  { id: "arquivado", label: "Arquivado", state: arquivado, set: setArquivado },
                  { id: "emRenovacao", label: "Em Renovação", state: emRenovacao, set: setEmRenovacao },
                  { id: "pendente", label: "Pendente", state: pendente, set: setPendente },
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer group w-fit">
                    <input
                      type="checkbox"
                      className="!w-4 !h-4 !min-w-[16px] !min-h-[16px] accent-primary border-primary/30 rounded cursor-pointer"
                      checked={item.state}
                      onChange={(e) => item.set(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-primary/60 group-hover:text-primary/90">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase">Anexo *</label>
              <Input 
                type="file" 
                accept=".pdf,.doc,.docx,.jpg,.png"
                className={`h-10 cursor-pointer transition-colors ${
                  anexo 
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800 file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200' 
                  : 'border-primary/30 file:bg-primary/10 file:text-primary/70 hover:file:bg-primary/20'
                } file:border-0 file:rounded-md file:px-3 file:font-bold file:mr-3 file:h-full`}
                onChange={(e) => setAnexo(e.target.files ? e.target.files[0] : null)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase">Observações</label>
              <Textarea 
                placeholder="Digite aqui alguma observação..."
                className="resize-none border-primary/30 focus-visible:ring-primary min-h-[80px]"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
            
            <button type="submit" id="submitAdicionarAlvara" className="hidden" />
          </form>

          <DialogFooter className="p-4 border-t border-primary/10 bg-primary/5 shrink-0">
            <Button variant="outline" onClick={onClose} className="border-primary/30 text-primary/70 font-bold hover:bg-primary/10 h-10">
              Cancelar
            </Button>
            <Button 
              disabled={!isFormValid || isLoading}
              onClick={() => document.getElementById("submitAdicionarAlvara")?.click()}
              className="h-10 bg-brand hover:bg-brand-hover text-white font-bold min-w-[140px] disabled:opacity-50"
            >
              Adicionar Alvará
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* modal confirmação de inclusão */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="bg-white border-primary/20 rounded-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary font-bold text-lg">
              Confirmar Adição
            </AlertDialogTitle>
            <AlertDialogDescription className="text-primary/50 mt-2">
              Tem certeza que deseja adicionar este novo Alvará para a empresa <strong className="text-primary/70">{empresaSelecionada?.nome.split(' - ')[1].split(' (')[0]}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-9 border-primary/20 text-primary/60 font-bold hover:bg-primary/5 rounded-md">
              Revisar Dados
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-9 bg-brand hover:bg-brand-hover text-primary font-bold rounded-md"
              onClick={executarEnvio}
            >
              Sim, adicionar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
