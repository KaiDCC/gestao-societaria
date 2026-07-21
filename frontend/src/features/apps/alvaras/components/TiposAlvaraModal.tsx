import { useState, useEffect } from "react";
import { alvarasApi } from "../services/alvarasApi";
import type { TipoAlvara } from "../types";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Pencil, Trash2, Check, X, Settings, AlertCircle } from "lucide-react";
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

interface TiposAlvaraModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TiposAlvaraModal({ isOpen, onClose }: TiposAlvaraModalProps) {
  const [tipos, setTipos] = useState<TipoAlvara[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [novoTipo, setNovoTipo] = useState("");
  const [tipoParaExcluir, setTipoParaExcluir] = useState<{ id: number, nome: string } | null>(null);
  
  const [erroAtivo, setErroAtivo] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNome, setEditingNome] = useState("");

  useEffect(() => {
    if (isOpen) {
      carregarTipos();
    } else {
      setNovoTipo("");
      setEditingId(null);
      setErroAtivo(null);
    }
  }, [isOpen]);

  const carregarTipos = async () => {
    setIsLoading(true);
    setErroAtivo(null);
    try {
      const data = await alvarasApi.listarTipos();
      setTipos(data.tipos || data || []); 
    } catch (error) {
      toast.error("Erro ao carregar tipos de alvará.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdicionar = async () => {
    if (!novoTipo.trim()) return;
    setErroAtivo(null);
    try {
      await alvarasApi.adicionarTipo(novoTipo);
      toast.success("Tipo adicionado com sucesso!");
      setNovoTipo("");
      carregarTipos();
    } catch (error: any) {
      setErroAtivo(error.response?.data?.message || "Erro ao adicionar tipo.");
    }
  };

  const handleSalvarEdicao = async (id: number) => {
    if (!editingNome.trim()) return;
    setErroAtivo(null);
    try {
      await alvarasApi.editarTipo(id, editingNome);
      toast.success("Tipo atualizado com sucesso!");
      setEditingId(null);
      carregarTipos();
    } catch (error: any) {
      setErroAtivo(error.response?.data?.message || "Erro ao atualizar tipo.");
    }
  };

  const handleExcluir = async (id: number) => {
    setErroAtivo(null);
    try {
      await alvarasApi.excluirTipo(id);
      toast.success("Tipo excluído com sucesso!");
      carregarTipos();
    } catch (error: any) {

      const mensagemBackend = error.response?.data?.message;
      const mensagemErro = mensagemBackend || "Não foi possível excluir esse tipo pois possui Alvarás vinculados.";
      
      toast.error(mensagemErro);
      setErroAtivo(mensagemErro);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] bg-white border-none shadow-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-primary border-l-4 border-brand pl-2">
              <Settings className="text-brand" size={20} />
              Tipos de Alvarás
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            
            {erroAtivo && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold flex items-start gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <span>{erroAtivo}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Input 
                placeholder="Nome do novo tipo..." 
                value={novoTipo}
                onChange={(e) => setNovoTipo(e.target.value.toUpperCase())}
                className="bg-primary/5 border-primary/20 focus:border-brand"
                onKeyDown={(e) => e.key === 'Enter' && handleAdicionar()}
              />
              <Button 
                onClick={handleAdicionar}
                disabled={!novoTipo.trim()}
                className="bg-primary hover:bg-foreground-hover text-white font-bold"
              >
                <Plus size={17} /> Adicionar tipo 
              </Button>
            </div>

            <div className="border border-primary/10 rounded-lg overflow-hidden">
              <div className="max-h-[350px] overflow-y-auto custom-scrollbar bg-primary/5">
                {isLoading ? (
                  <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-brand mx-auto" /></div>
                ) : tipos.length === 0 ? (
                  <div className="p-8 text-center text-primary/40 text-sm">Nenhum tipo cadastrado.</div>
                ) : (
                  <ul className="divide-y divide-primary/10">
                    {tipos.map((tipo) => (
                      <li key={tipo.id} className="flex items-center justify-between p-3 hover:bg-white transition-colors">
                        {editingId === tipo.id ? (
                          <div className="flex items-center gap-2 w-full">
                            <Input 
                              value={editingNome}
                              onChange={(e) => setEditingNome(e.target.value.toUpperCase())}
                              className="h-8 text-sm"
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && handleSalvarEdicao(tipo.id)}
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => handleSalvarEdicao(tipo.id)}>
                              <Check size={16} />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary/40 hover:bg-primary/10" onClick={() => setEditingId(null)}>
                              <X size={16} />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="font-bold text-primary/70 text-sm">{tipo.nome}</span>
                            <div className="flex items-center gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-primary/40 hover:text-primary/60 hover:bg-primary/5"
                                onClick={() => { setEditingId(tipo.id); setEditingNome(tipo.nome); setErroAtivo(null); }}
                              >
                                <Pencil size={14} />
                              </Button>
                              <button
                                  className="text-primary/40 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                                  onClick={() => { setTipoParaExcluir({ id: tipo.id, nome: tipo.nome }); setErroAtivo(null); }}
                              >
                                  <Trash2 size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!tipoParaExcluir} onOpenChange={(open) => !open && setTipoParaExcluir(null)}>
        <AlertDialogContent className="bg-white border-primary/20 rounded-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary font-bold text-lg">
              Excluir Tipo de Alvará
            </AlertDialogTitle>
            <AlertDialogDescription className="text-primary/50 mt-2">
              Tem certeza que deseja excluir o tipo <strong className="text-primary/70">{tipoParaExcluir?.nome}</strong>? Esta ação não poderá ser desfeita e pode afetar alvarás já cadastrados com este tipo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-9 border-primary/20 text-primary/60 font-bold hover:bg-primary/5 rounded-md">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-9 bg-red-500 hover:bg-red-600 text-white font-bold rounded-md"
              onClick={() => {
                if (tipoParaExcluir) {
                  handleExcluir(tipoParaExcluir.id);
                  setTipoParaExcluir(null);
                }
              }}
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
