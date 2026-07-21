import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { alvarasApi } from "./services/alvarasApi";

export interface FiltrosAlvara {
  query: string;
  tipo_filter: string;
  status_empresa: string;
  sort_by: string;
}

export function useAlvaras() {
  const [dados, setDados] = useState({
  empresas: [],
  resumo: {
    no_prazo: 0,
    a_vencer: 0,
    vencidos: 0,
    sem_validade: 0,
    total: 0,
  }
});
  
  const [isLoading, setIsLoading] = useState(true);
  
  const [filtros, setFiltros] = useState<FiltrosAlvara>({
    query: "",
    tipo_filter: "",
    status_empresa: "A", 
    sort_by: "empresa"
  });

  const carregarAlvaras = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await alvarasApi.listarAlvaras(filtros);
      setDados({
        empresas: response.empresas || [],
        resumo: response.resumo || {
          no_prazo: 0,
          a_vencer: 0,
          vencidos: 0,
          sem_validade: 0,
          total: 0,
        }
      });
    } catch (error) {
      toast.error("Erro ao carregar os alvarás.");
    } finally {
      setIsLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    carregarAlvaras();
  }, [carregarAlvaras]);

  const atualizarFiltro = (chave: keyof FiltrosAlvara, valor: string) => {
    setFiltros(prev => ({ ...prev, [chave]: valor }));
  };

  return {
    empresas: dados.empresas,
    resumo: dados.resumo,
    isLoading,
    filtros,
    atualizarFiltro,
    recarregar: carregarAlvaras
  };
}
