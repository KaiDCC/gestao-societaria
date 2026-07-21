// src/features/apps/usuarios/components/ExcluirUsuarioModal.tsx
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";
import { usuariosApi } from "../services/usuariosApi";

interface ExcluirUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  usuario: any;
}

export function ExcluirUsuarioModal({ isOpen, onClose, onSuccess, usuario }: ExcluirUsuarioModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!usuario) return null;

  const executarExclusao = async () => {
    setIsLoading(true);
    try {
      await usuariosApi.excluirUsuario(usuario.id);
      toast.success("Usuário excluído com sucesso!");
      onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Erro ao excluir usuário.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  
  // Trava 2: Responsável está em uso nos alvarás
const isEmUso = Boolean(usuario.em_uso_alvara);

  const bloqueado = isEmUso;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-white border-primary/20 rounded-xl shadow-xl max-w-[450px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full ${bloqueado ? 'bg-amber-50' : 'bg-red-50'}`}>
              {bloqueado ? (
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              ) : (
                <Trash2 className="h-6 w-6 text-red-600" />
              )}
            </div>
            <AlertDialogTitle className="text-primary font-bold text-xl">
              {bloqueado ? "Ação Bloqueada" : "Excluir Usuário"}
            </AlertDialogTitle>
          </div>
          
          <AlertDialogDescription className="text-primary/60 text-sm leading-relaxed pt-2">
            {isEmUso ? (
              <span>
                Este usuário está vinculado a <strong>um ou mais alvarás que estão em uso</strong>. <br/><br/>
                Para excluir este usuário, você deve primeiro desvincular os alvarás que utilizam esse responsável.
              </span>
            ) : (
              <span>
                Tem certeza que deseja excluir o usuário <strong>{usuario.nome}</strong>? <br/><br/>
                O registro de responsável vinculado a ele também será excluído do sistema. <strong>Esta ação não pode ser desfeita.</strong>
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="mt-6">
          {bloqueado ? (
            <Button 
              className="w-full bg-primary/20 hover:bg-primary/30 text-primary/80 font-bold h-11 rounded-lg" 
              onClick={onClose}
            >
              Entendi
            </Button>
          ) : (
            <>
              <AlertDialogCancel 
                disabled={isLoading} 
                className="h-11 border-primary/20 text-primary/60 font-bold hover:bg-primary/5 rounded-lg w-full sm:w-auto"
              >
                Cancelar
              </AlertDialogCancel>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white font-bold h-11 rounded-lg min-w-[120px] w-full sm:w-auto mt-2 sm:mt-0"
                disabled={isLoading}
                onClick={executarExclusao}
              >
                {isLoading ? "Excluindo..." : "Sim, Excluir"}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
