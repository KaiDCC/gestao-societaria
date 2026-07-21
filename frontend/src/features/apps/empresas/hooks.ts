import { useState, useEffect, useCallback } from "react";
import { empresasApi } from "./services/empresasApi";
import type { Empresa } from "./types";
import { toast } from "sonner";

export function useEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("A"); // "A" para Ativos por padrão

  const fetchEmpresas = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await empresasApi.listar({ 
        query: searchTerm, 
        status: statusFilter 
      });
      if (data.success) {
        setEmpresas(data.empresas);
      }
    } catch (error) {
      toast.error("Erro ao carregar lista de empresas.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter]);

  // Busca inicial e re-busca quando filtros mudam
  useEffect(() => {
    // Um pequeno debounce para não sobrecarregar a API enquanto digita
    const delay = setTimeout(() => {
      fetchEmpresas();
    }, 500);
    return () => clearTimeout(delay);
  }, [fetchEmpresas]);

  const handleSincronizar = async () => {
    setIsSyncing(true);
    try {
      const data = await empresasApi.sincronizar();
      if (data.success) {
        toast.success("Empresas sincronizadas com sucesso!");
        fetchEmpresas(); // Atualiza a lista após sincronizar
      } else {
        toast.error(data.message || "Falha na sincronização.");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao comunicar com o servidor.");
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    empresas,
    isLoading,
    isSyncing,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    handleSincronizar
  };
}
