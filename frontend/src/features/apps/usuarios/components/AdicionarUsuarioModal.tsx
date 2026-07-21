import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Eye, EyeOff, Info, Shield } from "lucide-react";
import { api } from "@/lib/api";

interface AdicionarUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdicionarUsuarioModal({ isOpen, onClose, onSuccess }: AdicionarUsuarioModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Campos de Texto
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  // Permissões
  const [isAdmin, setIsAdmin] = useState(false);
  const [canAdd, setCanAdd] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canExport, setCanExport] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNome("");
      setEmail("");
      setSenha("");
      setIsAdmin(false);
      setCanAdd(false);
      setCanEdit(false);
      setCanDelete(false);
      setCanExport(false);
      setMostrarSenha(false);
    }
  }, [isOpen]);

  // Se marcar como Admin, as outras opções podem ficar ativas automaticamente para UX (opcional, o back aceita de qualquer forma)
  const handleAdminToggle = (checked: boolean) => {
    setIsAdmin(checked);
    if (checked) {
      setCanAdd(true);
      setCanEdit(true);
      setCanDelete(true);
      setCanExport(true);
    }
  };

  const isFormValid = nome.trim() !== "" && email.trim() !== "" && senha.trim() !== "";

  const executarEnvio = async () => {
    setIsLoading(true);
    try {
      await api.post('/api/usuarios', {
        nome,
        email,
        senha,
        is_admin: isAdmin,
        can_add: canAdd,
        can_edit: canEdit,
        can_delete: canDelete,
        can_export: canExport
      });

      toast.success("Usuário criado com sucesso!");
      onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Erro ao criar usuário.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Componente interno para os switches
  const ToggleSwitch = ({ label, checked, onChange, disabled = false }: any) => (
    <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/10 rounded-lg">
      <span className="text-sm font-bold text-primary/70">{label}</span>
      <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
        <div className="w-9 h-5 bg-primary/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-primary/30 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
      </label>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white border-none shadow-2xl rounded-xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b border-primary/10 bg-primary/5 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
            <UserPlus className="text-brand" size={24} />
            Adicionar Novo Usuário
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase">Nome Completo *</label>
              <Input 
                placeholder="Ex: Kailane Silva" 
                value={nome} 
                onChange={(e) => setNome(e.target.value)} 
                className="h-10 border-primary/30 focus-visible:ring-primary"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase">Email (Login) *</label>
              <Input 
                type="email" 
                placeholder="kailane@exemplp.com.br" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="h-10 border-primary/30 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase">Senha *</label>
              <div className="relative">
                <Input 
                  type={mostrarSenha ? "text" : "password"} 
                  value={senha} 
                  onChange={(e) => setSenha(e.target.value)} 
                  className="h-10 border-primary/30 focus-visible:ring-primary pr-10"
                />
                <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/400">
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-primary/60 uppercase flex items-center gap-2">
              <Shield size={14} /> Permissões do Sistema
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <ToggleSwitch label="Administrador Total" checked={isAdmin} onChange={handleAdminToggle} />
              </div>
              <ToggleSwitch label="Pode Adicionar" checked={canAdd} onChange={setCanAdd} disabled={isAdmin} />
              <ToggleSwitch label="Pode Editar" checked={canEdit} onChange={setCanEdit} disabled={isAdmin} />
              <ToggleSwitch label="Pode Excluir" checked={canDelete} onChange={setCanDelete} disabled={isAdmin} />
              <ToggleSwitch label="Pode Exportar" checked={canExport} onChange={setCanExport} disabled={isAdmin} />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 items-start">
            <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
            <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
              Ao criar um usuário, o sistema também <strong>cria automaticamente um responsável</strong> com o mesmo nome para uso nos alvarás.
            </p>
          </div>

        </div>

        <DialogFooter className="p-4 border-t border-primary/10 bg-v5 shrink-0">
          <Button variant="outline" onClick={onClose} className="border-primary/30 text-primary/70 font-bold hover:bg-primary/10 h-10">Cancelar</Button>
          <Button disabled={!isFormValid || isLoading} onClick={executarEnvio} className="h-10 bg-brand hover:bg-brand-hover text-primary font-bold min-w-[140px]">
            {isLoading ? "Processando..." : "Criar Usuário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
