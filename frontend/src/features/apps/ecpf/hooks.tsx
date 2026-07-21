// src/features/apps/ecpf/hooks.tsx
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { ecpfApi } from "./services/ecpfApi";
import type { Ecpf } from "./types";

export function useEcpfs() {
  const [allEcpfs, setAllEcpfs] = useState<Ecpf[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    query: "",
    sort_by: "validade",
    empresa_vinculada: "",
  });

  const carregarEcpfs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.query) params.append("query", filtros.query);
      params.append("include_vinculos", "true");

      // Substituído o api.get pelo ecpfApi.listar
      const data = await ecpfApi.listar(params);
      setAllEcpfs(data.ecpfs || []);
    } catch (error) {
      toast.error("Erro ao carregar dados dos e-CPFs.");
    } finally {
      setIsLoading(false);
    }
  }, [filtros.query]); 

  useEffect(() => {
    carregarEcpfs();
  }, [carregarEcpfs]);

  const atualizarFiltro = (campo: string, valor: string) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  };

  return {
    allEcpfs,
    isLoading,
    filtros,
    atualizarFiltro,
    recarregar: carregarEcpfs
  };
}
