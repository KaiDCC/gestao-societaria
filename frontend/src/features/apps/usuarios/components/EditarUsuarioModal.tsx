// src/pages/usuarios/components/EditarUsuarioModal.tsx
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Eye, EyeOff, Shield, ShieldCheck, Briefcase } from "lucide-react";
import { api } from "@/lib/api";

interface EditarUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  usuarioOriginal: any;
}

export function EditarUsuarioModal({ isOpen, onClose, onSuccess, usuarioOriginal }: EditarUsuarioModalProps) {
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
    if (isOpen && usuarioOriginal) {
      setNome(usuarioOriginal.nome || "");
      setEmail(usuarioOriginal.email || "");
      setSenha(""); // Senha vazia significa não alterar
      setIsAdmin(usuarioOriginal.is_admin || false);
      setCanAdd(usuarioOriginal.can_add || false);
      setCanEdit(usuarioOriginal.can_edit || false);
      setCanDelete(usuarioOriginal.can_delete || false);
      setCanExport(usuarioOriginal.can_export || false);
      setMostrarSenha(false);
    }
  }, [isOpen, usuarioOriginal]);

  const handleAdminToggle = (checked: boolean) => {
    setIsAdmin(checked);
    if (checked) {
      setCanAdd(true);
      setCanEdit(true);
      setCanDelete(true);
      setCanExport(true);
    }
  };

  const isFormValid = nome.trim() !== "" && email.trim() !== "";

  const executarEdicao = async () => {
    if (!usuarioOriginal) return;
    setIsLoading(true);
    try {
      const payload: any = {
        nome,
        email,
        is_admin: isAdmin,
        can_add: canAdd,
        can_edit: canEdit,
        can_delete: canDelete,
        can_export: canExport
      };

      if (senha.trim() !== "") {
        payload.senha = senha;
      }

      await api.put(`/api/usuarios/${usuarioOriginal.id}`, payload);

      toast.success("Usuário atualizado com sucesso!");
      onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Erro ao atualizar usuário.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const ToggleSwitch = ({ label, checked, onChange, disabled = false }: any) => (
    <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/10 rounded-lg">
      <span className="text-sm font-bold text-primary/70">{label}</span>
      <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
        <div className="w-9 h-5 bg-primary/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-primary/30 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
      </label>
    </div>
  );

  if (!usuarioOriginal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white border-none shadow-2xl rounded-xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b border-primary/10 bg-primary/5 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
            <Edit className="text-brand" size={24} />
            Editar Usuário
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* SEÇÃO INFORMATIVA DO RESPONSÁVEL */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-primary/50 uppercase tracking-tight flex items-center gap-2">
              <Briefcase size={14} /> Responsável Vinculado
            </h4>
            <div className="flex justify-between items-center bg-white p-3 rounded border border-primary/10 shadow-sm">
              <div>
                <p className="text-[10px] text-primary/40 font-bold uppercase mb-0.5">Nome Atual</p>
                <p className="text-sm font-bold text-primary/80">{usuarioOriginal.nome}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-primary/40 font-bold uppercase mb-0.5">Usado em Alvarás</p>
                {usuarioOriginal.em_uso_alvara ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <ShieldCheck size={14} /> Sim
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-primary/40">
                    Não
                  </span>
                )}
              </div>
            </div>
            <p className="text-[10px] text-primary/50 leading-relaxed">
              Se alterar o nome do usuário abaixo, o sistema atualizará automaticamente o nome do responsável em todos os alvarás antigos.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase">Nome Completo *</label>
              <Input 
                value={nome} 
                onChange={(e) => setNome(e.target.value)} 
                className="h-10 border-primary/30 focus-visible:ring-primary"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase">Email (Login) *</label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="h-10 border-primary/30 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/60 uppercase">Nova Senha (Opcional)</label>
              <div className="relative">
                <Input 
                  type={mostrarSenha ? "text" : "password"} 
                  value={senha} 
                  onChange={(e) => setSenha(e.target.value)} 
                  placeholder="Deixe em branco para não alterar"
                  className="h-10 border-primary/30 focus-visible:ring-primary pr-10"
                />
                <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40">
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

        </div>

        <DialogFooter className="p-4 border-t border-primary/10 bg-primary/5 shrink-0">
          <Button variant="outline" onClick={onClose} className="border-primary/30 text-primary/70 font-bold hover:bg-primary/10 h-10">Cancelar</Button>
          <Button disabled={!isFormValid || isLoading} onClick={executarEdicao} className="h-10 bg-brand hover:bg-brand-hover text-white font-bold min-w-[140px]">
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
