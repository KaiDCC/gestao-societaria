// certificados/components/EditarCertificadoModal.tsx
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, FileEdit, CheckCircle2, Copy, Check, Eye, EyeOff, Paperclip, AlertTriangle } from "lucide-react";
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

interface EditarCertificadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  certificadoOriginal: any;
}

export function EditarCertificadoModal({ isOpen, onClose, onSuccess, certificadoOriginal }: EditarCertificadoModalProps) {
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
  const [arquivoNovo, setArquivoNovo] = useState<File | null>(null);
  const [observacoes, setObservacoes] = useState("");

  const isFormValid = empresaSelecionada && senha;

  useEffect(() => {
    if (isOpen && certificadoOriginal) {
      setEmpresaSelecionada({
        id: certificadoOriginal.empresa_id || certificadoOriginal.codigo_empresa,
        nome: `${certificadoOriginal.codigo_empresa} - ${certificadoOriginal.empresa_nome || certificadoOriginal.razao_social} (${certificadoOriginal.cnpj})`
      });
      setSenha(certificadoOriginal.senha || "");
      setObservacoes(certificadoOriginal.observacoes || "");
      
      setArquivoNovo(null);
      setMostrarSenha(false);
      setCopiado(false);
      setBuscaEmpresa("");
      setEmpresasEncontradas([]);
    }
  }, [isOpen, certificadoOriginal]);

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
        if (isSearchNumeric) {
          if (codA === qNum && codB !== qNum) return -1;
          if (codB === qNum && codA !== qNum) return 1;
          return codA - codB;
        }
        return String(a.nome_emp).localeCompare(String(b.nome_emp));
      });
      setEmpresasEncontradas(resultados);
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
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pfx')) {
        toast.error("Formato inválido! Apenas arquivos .pfx são permitidos.");
        e.target.value = '';
        setArquivoNovo(null);
        return;
      }
      setArquivoNovo(file);
      setSenha("");
    } else {
      setArquivoNovo(null);
    }
  };

  const executarEdicao = async () => {
    if (!certificadoOriginal) return;
    setIsConfirmOpen(false);
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("codigo_empresa", empresaSelecionada!.nome.split(' - ')[0]);
      formData.append("senha", senha);
      formData.append("observacoes", observacoes);

      if (arquivoNovo) {
        formData.append("arquivo_certificado", arquivoNovo);
      }

      await api.put(`/api/certificados/${certificadoOriginal.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success("Certificado atualizado com sucesso!");
      onSuccess();
      onClose();
    } catch (error: any) {
      const msgOriginal = error.response?.data?.message || error.message || "";
      const msg = String(msgOriginal).toLowerCase();
      
      let mensagemUsuario = msgOriginal;
      if (msg.includes("invalid password") || msg.includes("pkcs12") || msg.includes("processar")) {
        mensagemUsuario = "A senha digitada não confere com o arquivo .pfx selecionado. Verifique os dados e tente novamente.";
      } else if (msg.includes("já existe") || msg.includes("vinculado")) {
        mensagemUsuario = "Já existe um certificado para esta empresa no sistema.";
      }

      setErrorMessage(mensagemUsuario);
      setIsErrorDialogOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!certificadoOriginal) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[650px] bg-white border-none shadow-2xl rounded-xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 pb-4 border-b border-primary/10 bg-primary/5 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
              <FileEdit className="text-brand" size={24} />
              Alterar Certificado (e-CNPJ)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); setIsConfirmOpen(true); }} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            
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
                          <span className="font-bold text-primary/90">{emp.codigo_empresa}</span> - {emp.nome_emp} <span className="text-primary/40 text-xs">({emp.cnpj})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-primary/60 uppercase">
                    Senha do Certificado {!arquivoNovo && <span className="text-[10px] lowercase font-normal">(Somente leitura)</span>} *
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                    <Input 
                        type={mostrarSenha ? "text" : "password"} 
                        className={cn(
                        "h-10 border-primary/30 focus-visible:ring-primary pr-10",
                        !arquivoNovo && "bg-primary/5 cursor-not-allowed opacity-80"
                        )}
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        autoComplete="off"
                        disabled={!arquivoNovo}
                        required
                    />
                    <button 
                        type="button" 
                        onClick={() => setMostrarSenha(!mostrarSenha)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40"
                    >
                        {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    </div>
                    
                    <Button 
                    type="button" 
                    variant="outline" 
                    onClick={copiarSenha} 
                    className={cn("h-10 px-4 font-bold border-primary/30 transition-all", copiado ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white hover:bg-primary/5")}
                    >
                    {copiado ? <Check size={18} className="mr-2" /> : <Copy size={18} className="mr-2 text-brand" />}
                    {copiado ? "Copiado" : "Copiar"}
                    </Button>
                </div>
                {!arquivoNovo && (
                    <p className="text-[10px] text-primary/40 font-medium">
                    Para alterar a senha, você deve selecionar um novo arquivo .pfx abaixo.
                    </p>
                )}
                </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-primary/60 uppercase">Substituir Arquivo (.pfx)</label>
              {certificadoOriginal.arquivo_url && !arquivoNovo && (
                <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-200 rounded-md text-blue-800 text-sm font-medium">
                  <span className="flex items-center gap-2"><Paperclip size={16} /> Arquivo Atual do Certificado</span>
                  <a href={`${api.defaults.baseURL || ''}${certificadoOriginal.arquivo_url}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-xs bg-white px-2 py-1 rounded border border-blue-200">
                    Baixar
                  </a>
                </div>
              )}
              <Input type="file" accept=".pfx" onChange={handleFileChange} className={cn("h-10 cursor-pointer transition-colors", arquivoNovo ? "bg-emerald-50 border-emerald-400 text-emerald-800" : "border-primary/30")} />
              <p className="text-[11px] text-primary/40 font-medium">Selecione um novo arquivo para substituir o atual. Apenas arquivos .pfx</p>
              {arquivoNovo && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-start gap-3 animate-in fade-in zoom-in duration-300">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium leading-relaxed">
                    <strong className="block mb-1">Arquivo alterado!</strong>
                    Certifique-se de que a senha atual permanece a mesma ou troque para a nova senha antes de salvar.
                  </p>
                </div>
              )}
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
          </form>

          <DialogFooter className="p-4 border-t border-primary/10 bg-primary/5 shrink-0">
            <Button variant="outline" onClick={onClose} className="border-primary/30 text-primary/70 font-bold hover:bg-primary/10 h-10">
              Cancelar
            </Button>
            <Button disabled={!isFormValid || isLoading} onClick={() => setIsConfirmOpen(true)} className="h-10 bg-brand hover:bg-brand-hover text-white font-bold min-w-[160px] disabled:opacity-50">
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="bg-white border-primary/20 rounded-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary font-bold text-lg">Confirmar Alterações</AlertDialogTitle>
            <AlertDialogDescription className="text-primary/50 mt-2">
              Deseja salvar as alterações deste certificado da empresa <strong className="text-primary/70">{empresaSelecionada?.nome.split(' - ')[1].split(' (')[0]}</strong>?
              {arquivoNovo && <p className="text-emerald-600 mt-2 font-medium">Você está substituindo o arquivo .pfx, a validade será recalculada.</p>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-9 border-primary/20 text-primary/60 font-bold hover:bg-primary/5 rounded-md">Revisar</AlertDialogCancel>
            <AlertDialogAction className="h-9 bg-brand hover:bg-brand-hover text-primary font-bold rounded-md" onClick={executarEdicao}>Sim, salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <AlertDialogContent className="bg-white border-red-200 rounded-xl shadow-2xl max-w-[500px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-50 rounded-full"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
              <AlertDialogTitle className="text-red-900 font-bold text-xl">Erro ao Editar</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-primary/60 text-sm leading-relaxed pt-2">{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <Button className="w-40 bg-red-600 hover:bg-red-700 text-white font-bold h-11 rounded-lg transition-colors" onClick={() => setIsErrorDialogOpen(false)}>
              Revisar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
