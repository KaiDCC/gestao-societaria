// certificados/components/AdicionarCertificadoModal.tsx
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, Key, CheckCircle2, Copy, Check, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
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

import { api } from "@/lib/api";

interface AdicionarCertificadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdicionarCertificadoModal({ isOpen, onClose, onSuccess }: AdicionarCertificadoModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [buscaEmpresa, setBuscaEmpresa] = useState("");
  const [empresasEncontradas, setEmpresasEncontradas] = useState<any[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<{id: number, nome: string} | null>(null);

  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [observacoes, setObservacoes] = useState("");

  const isFormValid = empresaSelecionada && senha && arquivo;

  useEffect(() => {
    if (isOpen) {
      limparFormulario();
    }
  }, [isOpen]);

  const limparFormulario = () => {
    setEmpresaSelecionada(null);
    setBuscaEmpresa("");
    setEmpresasEncontradas([]);
    setSenha("");
    setMostrarSenha(false);
    setCopiado(false);
    setArquivo(null);
    setObservacoes("");
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
      setEmpresasEncontradas(response.data.empresas || []);
    } catch (error) {
      console.error("Erro ao buscar empresas", error);
    }
  };

  const selecionarEmpresa = (empresa: any) => {
    setEmpresaSelecionada({ 
      id: empresa.id, 
      nome: `${empresa.codigo_empresa} - ${empresa.nome_emp} (${empresa.cnpj})` 
    });
    setBuscaEmpresa("");
    setEmpresasEncontradas([]);
  };

  const copiarSenha = () => {
    if (!senha) return;
    const darFeedback = () => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file && !file.name.toLowerCase().endsWith('.pfx')) {
      toast.error("Formato inválido! Apenas arquivos .pfx são permitidos.");
      e.target.value = '';
      setArquivo(null);
      return;
    }
    setArquivo(file);
  };

  const executarEnvio = async () => {
    setIsConfirmOpen(false);
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("codigo_empresa", empresaSelecionada!.nome.split(' - ')[0]);
      formData.append("senha", senha);
      formData.append("observacoes", observacoes);
      if (arquivo) formData.append("arquivo_certificado", arquivo);

      await api.post('/api/certificados', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success("Certificado adicionado com sucesso!");
      onSuccess();
      onClose();
    } catch (error: any) {
      const msgOriginal = error.response?.data?.message || error.message || "";
      const msg = String(msgOriginal).toLowerCase();
      
      let mensagemUsuario = msgOriginal;
      if (msg.includes("já existe") || msg.includes("vinculado")) {
        mensagemUsuario = "Esta empresa já possui um certificado vinculado. Caso queira atualizar, feche este formulário, busque a empresa na listagem principal e utilize o botão 'Editar'.";
      } else if (msg.includes("invalid password") || msg.includes("pkcs12") || msg.includes("processar")) {
        mensagemUsuario = "A senha digitada não confere com o arquivo .pfx selecionado ou o arquivo está corrompido. Verifique os dados e tente novamente.";
      }

      setErrorMessage(mensagemUsuario);
      setIsErrorDialogOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[650px] bg-white border-none shadow-2xl rounded-xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 pb-4 border-b border-primary/10 bg-primary/5 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
              <Key className="text-brand" size={24} />
              Adicionar Certificado (e-CNPJ)
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            {/* BUSCA DE EMPRESA COM ESTILIZAÇÃO ORIGINAL */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase">Empresa *</label>
              {empresaSelecionada ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    {empresaSelecionada.nome}
                  </span>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-emerald-700 hover:bg-emerald-100" onClick={() => setEmpresaSelecionada(null)}>
                    Trocar Empresa
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-primary/40" />
                  <Input 
                    placeholder="Pesquisar por código, nome ou CNPJ..." 
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
                          <span className="font-bold text-primary/90">{emp.codigo_empresa}</span> - {emp.nome_emp}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SENHA COM ESTILIZAÇÃO ORIGINAL */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase">Senha do Certificado *</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    type={mostrarSenha ? "text" : "password"} 
                    className="h-10 border-primary/30 focus-visible:ring-primary pr-10"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite a senha do arquivo .pfx"
                    autoComplete="off"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary/60 transition-colors"
                  >
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={copiarSenha}
                  disabled={!senha}
                  className={cn(
                    "h-10 px-4 font-bold border-primary/30 transition-all",
                    copiado ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white hover:bg-primary/5"
                  )}
                >
                  {copiado ? <Check size={18} className="mr-2" /> : <Copy size={18} className="mr-2 text-brand" />}
                  {copiado ? "Copiado" : "Copiar"}
                </Button>
              </div>
            </div>

            {/* UPLOAD COM ESTILIZAÇÃO ORIGINAL */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase">Arquivo do Certificado (.pfx) *</label>
              <Input 
                type="file" 
                accept=".pfx"
                className={`h-10 cursor-pointer transition-colors ${
                  arquivo 
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800 file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200' 
                  : 'border-primary/30 file:bg-primary/10 file:text-primary/70 hover:file:bg-primary/20'
                } file:border-0 file:rounded-md file:px-3 file:font-bold file:mr-3 file:h-full`}
                onChange={handleFileChange}
                required
              />
              <p className="text-[11px] text-primary/40 font-medium">Apenas arquivos com extensão .pfx são permitidos.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase">Observações</label>
              <Textarea 
                placeholder="Alguma observação relevante sobre este certificado?"
                className="resize-none border-primary/30 focus-visible:ring-primary min-h-[100px]"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-primary/10 bg-primary/5 shrink-0">
            <Button variant="outline" onClick={onClose} className="border-primary/30 text-primary/70 font-bold hover:bg-primary/10 h-10">
              Cancelar
            </Button>
            <Button 
              disabled={!isFormValid || isLoading}
              onClick={() => setIsConfirmOpen(true)}
              className="h-10 bg-brand hover:bg-brand-hover text-white font-bold min-w-[160px] disabled:opacity-50"
            >
              {isLoading ? "Processando..." : "Adicionar Certificado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG DE CONFIRMAÇÃO ORIGINAL */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="bg-white border-primary/20 rounded-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary font-bold text-lg">Confirmar Adição</AlertDialogTitle>
            <AlertDialogDescription className="text-primary/50 mt-2">
              Deseja salvar o certificado para a empresa <strong className="text-primary/70">{empresaSelecionada?.nome.split(' - ')[1]}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-9 border-primary/20 text-primary/60 font-bold hover:bg-primary/5 rounded-md">Revisar</AlertDialogCancel>
            <AlertDialogAction className="h-9 bg-brand hover:bg-brand-hover text-primary font-bold rounded-md" onClick={executarEnvio}>Sim, adicionar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL DE ERRO CRÍTICO */}
      <AlertDialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <AlertDialogContent className="bg-white border-red-200 rounded-xl shadow-2xl max-w-[500px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-50 rounded-full"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
              <AlertDialogTitle className="text-red-900 font-bold text-xl">Erro ao Cadastrar</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-primary/60 text-sm leading-relaxed pt-2">{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <Button className="w-30 bg-red-600 hover:bg-red-700 text-white font-bold h-11 rounded-lg transition-colors" onClick={() => setIsErrorDialogOpen(false)}>
              Revisar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
