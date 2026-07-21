// certificados/components/AdicionarEcpfModal.tsx
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Key, Copy, Check, Eye, EyeOff, AlertTriangle, FileUp } from "lucide-react";
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

interface AdicionarEcpfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdicionarEcpfModal({ isOpen, onClose, onSuccess }: AdicionarEcpfModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [observacoes, setObservacoes] = useState("");

  // Validação: Apenas senha e arquivo são obrigatórios para tentar o cadastro
  const isFormValid = senha && arquivo;

  useEffect(() => {
    if (isOpen) {
      limparFormulario();
    }
  }, [isOpen]);

  const limparFormulario = () => {
    setSenha("");
    setMostrarSenha(false);
    setCopiado(false);
    setArquivo(null);
    setObservacoes("");
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
      formData.append("senha", senha);
      formData.append("observacoes", observacoes);
      if (arquivo) formData.append("arquivo_certificado", arquivo);

      await api.post('/api/ecpfs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success("Certificado e-CPF adicionado com sucesso!");
      onSuccess();
      onClose();
    } catch (error: any) {
      const msgOriginal = error.response?.data?.message || error.message || "";
      const msg = String(msgOriginal).toLowerCase();
      
      let mensagemUsuario = "Erro interno ao cadastrar o certificado.";

      // Tratamento de erros blindado: pega a trava customizada do Python E a trava bruta do Banco de Dados (UNIQUE/Integrity)
      if (
        msg.includes("já existe") || 
        msg.includes("duplicado") || 
        msg.includes("vinculado") || 
        msg.includes("unique") || 
        msg.includes("integrity")
      ) {
        mensagemUsuario = "Já existe um certificado e-CPF cadastrado para este CPF. Caso queira atualizar, feche este formulário, busque o cpf na listagem principal e utilize o botão 'Editar";
      } else if (msg.includes("invalid password") || msg.includes("pkcs12") || msg.includes("processar") || msg.includes("mac verify")) {
        mensagemUsuario = "A senha digitada não confere com o arquivo .pfx selecionado. Verifique os dados e tente novamente.";
      } else if (msg.includes("inválido")) {
        mensagemUsuario = "O CPF extraído do certificado é inválido. O arquivo pode estar corrompido.";
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
              Adicionar Certificado (e-CPF)
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            
            {/* UPLOAD DE ARQUIVO */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase flex items-center gap-2">
                <FileUp size={14} /> Arquivo do Certificado (.pfx) *
              </label>
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

            {/* SENHA */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase flex items-center gap-2">
                <Key size={14} /> Senha do Certificado *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    type={mostrarSenha ? "text" : "password"} 
                    className="h-10 border-primary/30 focus-visible:ring-primary pr-10"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite a senha do arquivo"
                    autoComplete="new-password"
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

            {/* OBSERVAÇÕES */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase">Observações</label>
              <Textarea 
                placeholder="Alguma observação relevante sobre este e-CPF?"
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
              {isLoading ? "Processando..." : "Adicionar e-CPF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="bg-white border-primary/20 rounded-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary font-bold text-lg">Confirmar Adição</AlertDialogTitle>
            <AlertDialogDescription className="text-primary/50 mt-2">
              Deseja salvar este certificado e-CPF no sistema? Os dados do titular serão lidos diretamente do arquivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-9 border-primary/20 text-primary/60 font-bold hover:bg-primary/5 rounded-md">Revisar</AlertDialogCancel>
            <AlertDialogAction className="h-9 bg-brand hover:bg-brand-hover text-primary font-bold rounded-md" onClick={executarEnvio}>Sim, adicionar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ERRO CRÍTICO */}
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
            <Button className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold h-11 rounded-lg transition-colors" onClick={() => setIsErrorDialogOpen(false)}>
              Revisar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
