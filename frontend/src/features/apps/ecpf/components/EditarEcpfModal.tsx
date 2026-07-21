import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileEdit, Key, User, CreditCard, Building2, Paperclip, AlertTriangle, Check, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
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

interface EditarEcpfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ecpfOriginal: any;
}

export function EditarEcpfModal({ isOpen, onClose, onSuccess, ecpfOriginal }: EditarEcpfModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [arquivoNovo, setArquivoNovo] = useState<File | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [codiEmp, setCodiEmp] = useState("");
  const [empresasVinculadas, setEmpresasVinculadas] = useState<any[]>([]);
  const [isAtualizandoEmpresas, setIsAtualizandoEmpresas] = useState(false);

  // Inicializa os dados ao abrir o modal
  useEffect(() => {
    if (isOpen && ecpfOriginal) {
      setSenha(ecpfOriginal.senha || "");
      setObservacoes(ecpfOriginal.observacoes || "");
      setCodiEmp(ecpfOriginal.codi_emp || "");
      setArquivoNovo(null);
      setMostrarSenha(false);
      setCopiado(false);
      buscarEmpresasParaCpf(ecpfOriginal.cpf);
    }
  }, [isOpen, ecpfOriginal]);

  const buscarEmpresasParaCpf = async (cpf: string) => {
    try {
      const response = await api.get(`/api/ecpfs/buscar-codi-emp-por-cpf?cpf=${cpf}`);
      const lista = response.data.empresas || [];
      
      // Adiciona a opção "Todos" se não houver
      if (!lista.some((e: any) => e.codigo_empresa === "Todos")) {
          lista.push({ codigo_empresa: "Todos", nome_emp: "Vincular a Todas as Empresas" });
      }
      setEmpresasVinculadas(lista);
    } catch (error) {
      console.error("Erro ao buscar empresas vinculadas", error);
      toast.error("Erro ao carregar a lista de empresas vinculadas.");
    }
  };

  const handleAtualizarEmpresas = async () => {
    if (!ecpfOriginal?.cpf) return;
    setIsAtualizandoEmpresas(true);
    await buscarEmpresasParaCpf(ecpfOriginal.cpf);
    toast.success("Lista de empresas atualizada!");
    setIsAtualizandoEmpresas(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pfx')) {
        toast.error("Apenas arquivos .pfx são permitidos.");
        e.target.value = '';
        setArquivoNovo(null);
        return;
      }
      setArquivoNovo(file);
      setSenha(""); // Limpa a senha para forçar a redigitação do novo arquivo
    } else {
      setArquivoNovo(null);
      setSenha(ecpfOriginal.senha || "");
    }
  };

  const copiarSenha = () => {
    if (!senha) return;
    const darFeedback = () => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); toast.success("Copiado!"); };
    const container = document.querySelector('[role="dialog"]') || document.body;
    const textArea = document.createElement("textarea");
    textArea.value = senha; textArea.style.position = "fixed"; textArea.style.opacity = "0";
    container.appendChild(textArea); textArea.focus(); textArea.select();
    document.execCommand("copy"); container.removeChild(textArea); darFeedback();
  };

  const executarEdicao = async () => {
    if (!ecpfOriginal) return;
    setIsConfirmOpen(false);
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("senha", senha);
      formData.append("observacoes", observacoes);
      formData.append("codi_emp", codiEmp);

      if (arquivoNovo) {
        formData.append("arquivo_certificado", arquivoNovo);
      }

      await api.put(`/api/ecpfs/${ecpfOriginal.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success("e-CPF atualizado com sucesso!");
      onSuccess();
      onClose();
    } catch (error: any) {
      const msgOriginal = error.response?.data?.message || error.message || "";
      const msg = String(msgOriginal).toLowerCase();
      
      let mensagemUsuario = msgOriginal;
      
      // Validação de segurança: se o CPF do arquivo novo for diferente do original
      if (msg.includes("não corresponde") || msg.includes("diferente") || msg.includes("titular")) {
          mensagemUsuario = "Erro de Titularidade! O arquivo selecionado pertence a um CPF diferente do atual.";
      } else if (msg.includes("invalid password") || msg.includes("pkcs12")) {
          mensagemUsuario = "A senha digitada está incorreta para este novo arquivo .pfx.";
      }

      setErrorMessage(mensagemUsuario);
      setIsErrorDialogOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!ecpfOriginal) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[650px] bg-white border-none shadow-2xl rounded-xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 pb-4 border-b border-primary/10 bg-primary/5 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
              <FileEdit className="text-brand" size={24} />
              Editar Certificado e-CPF
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            
            {/* DADOS DO TITULAR (SOMENTE LEITURA COM LAYOUT AJUSTADO) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-primary/5 p-4 rounded-lg border border-primary/10">
              <div className="space-y-1 md:col-span-2 overflow-hidden">
                <label className="text-[10px] font-bold text-primary/40 uppercase flex items-center gap-1">
                  <User size={12} /> Titular
                </label>
                <p className="text-sm font-bold text-primary/60 truncate" title={ecpfOriginal.nome_pessoa}>
                  {ecpfOriginal.nome_pessoa}
                </p>
              </div>
              <div className="space-y-1 md:col-span-1 border-l border-primary/20 pl-4 md:border-l-2 md:border-primary/20">
                <label className="text-[10px] font-bold text-primary/40 uppercase flex items-center gap-1">
                  <CreditCard size={12} /> CPF
                </label>
                <p className="text-sm font-bold text-primary/60">{ecpfOriginal.cpf}</p>
              </div>
            </div>

            {/* SENHA (LIBERA SÓ COM NOVO ARQUIVO) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase flex items-center gap-2">
                <Key size={14} /> Senha do Certificado {!arquivoNovo && <span className="text-[10px] lowercase font-normal">(travada ao arquivo atual)</span>}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    type={mostrarSenha ? "text" : "password"} 
                    className={cn("h-10 border-primary/30 focus-visible:ring-primary pr-10", !arquivoNovo && "bg-primary/5 cursor-not-allowed text-primary/50")}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    disabled={!arquivoNovo}
                    autoComplete="off"
                  />
                  <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40">
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <Button type="button" variant="outline" onClick={copiarSenha} className={cn("h-10 px-4 font-bold border-primary/30", copiado ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white")}>
                  {copiado ? <Check size={18} /> : <Copy size={18} />}
                </Button>
              </div>
            </div>

            {/* ARQUIVO */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-primary/60 uppercase">Substituir Arquivo (.pfx)</label>
              {!arquivoNovo && ecpfOriginal.arquivo && (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-md text-blue-800 text-xs font-medium">
                  <span className="flex items-center gap-2"><Paperclip size={14} /> {ecpfOriginal.arquivo}</span>
                </div>
              )}
              <Input type="file" accept=".pfx" onChange={handleFileChange} className={cn("h-10", arquivoNovo && "bg-emerald-50 border-emerald-400")} />
              {arquivoNovo && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium leading-relaxed">
                    Você está alterando o arquivo. <strong>Certifique-se de que o CPF é o mesmo</strong>, caso contrário a atualização será bloqueada.
                  </p>
                </div>
              )}
            </div>

            {/* VINCULO EMPRESARIAL COM BOTÃO DE ATUALIZAR */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase flex items-center gap-2">
                <Building2 size={14} /> Código da Empresa (codi_emp)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select 
                  className="flex-1 h-10 px-3 rounded-md border border-primary/30 bg-white text-sm font-medium focus:border-brand outline-none"
                  value={codiEmp}
                  onChange={(e) => setCodiEmp(e.target.value)}
                >
                  <option value="">Nenhum Vínculo</option>
                  {empresasVinculadas.map((emp: any) => (
                    <option key={emp.codigo_empresa} value={emp.codigo_empresa}>
                      {emp.codigo_empresa} - {emp.nome_emp}
                    </option>
                  ))}
                </select>
                <Button 
                  type="button"
                  className="h-10 bg-brand hover:bg-brand-hover text-white font-bold shrink-0"
                  onClick={handleAtualizarEmpresas}
                  disabled={isAtualizandoEmpresas}
                >
                  {isAtualizandoEmpresas ? <RefreshCw className="animate-spin mr-2" size={16} /> : null}
                  {isAtualizandoEmpresas ? "Atualizando..." : "Atualizar Empresas"}
                </Button>
              </div>
              <p className="text-[10px] text-blue-600 font-medium bg-blue-50 inline-block px-2 py-0.5 rounded">
                Se existir no banco da domínio, será relacionado automaticamente.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase">Observações</label>
              <Textarea 
                className="resize-none border-primary/30 focus-visible:ring-primary min-h-[80px]"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-primary/10 bg-primary/5 shrink-0">
            <Button variant="outline" onClick={onClose} className="border-primary/30 font-bold h-10">Cancelar</Button>
            <Button disabled={isLoading} onClick={() => setIsConfirmOpen(true)} className="h-10 bg-brand hover:bg-brand-hover text-white font-bold min-w-[160px]">
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="bg-white border-primary/20 rounded-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary font-bold text-lg">Confirmar Alterações</AlertDialogTitle>
            <AlertDialogDescription className="text-primary/60 mt-2">Deseja aplicar as mudanças neste certificado?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-9 font-bold">Revisar</AlertDialogCancel>
            <AlertDialogAction className="h-9 bg-brand text-primary font-bold" onClick={executarEdicao}>Sim, salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <AlertDialogContent className="bg-white border-red-200 rounded-xl shadow-2xl max-w-[500px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-50 rounded-full"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
              <AlertDialogTitle className="text-red-900 font-bold text-xl">Erro ao atualizar</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-primary/60 text-sm leading-relaxed pt-2">{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <Button className="w-50 bg-red-600 hover:bg-red-700 text-white font-bold h-11 rounded-lg" onClick={() => setIsErrorDialogOpen(false)}>Revisar</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
