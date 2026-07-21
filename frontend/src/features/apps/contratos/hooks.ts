import { useState } from "react";
import { contratosApi } from "./services/contratosApi";
import type { EmpresaContratante } from "./types";
import { toast } from "sonner"; // Opcional: lib de notificações do shadcn

export function useEmpresaContrato() {
  const [loading, setLoading] = useState(false);
  const [empresa, setEmpresa] = useState<EmpresaContratante | null>(null);

  const buscarEmpresa = async (codigo: string) => {
    if (!codigo) return;
    
    setLoading(true);
    try {
      const res = await contratosApi.buscarEmpresa(codigo);
      if (res.success) {
        setEmpresa(res.empresa);
        toast.success("Empresa encontrada no Domínio!");
      }
    } catch (error: any) {
      setEmpresa(null);
      toast.error(error.response?.data?.message || "Erro ao buscar empresa.");
    } finally {
      setLoading(false);
    }
  };

  return { empresa, loading, buscarEmpresa };
}
