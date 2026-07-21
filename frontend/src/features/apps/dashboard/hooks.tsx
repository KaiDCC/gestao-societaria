import { useState, useEffect, useCallback } from "react";
import { dashboardApi } from "./services/dashboardApi";
import type { DashboardData } from "./types";
import { toast } from "sonner";

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await dashboardApi.obterResumo();
      if (response.success) {
        setData(response);
      } else {
        toast.error(response.message || "Falha ao carregar dashboard.");
      }
    } catch (error: any) {
      toast.error("Erro de comunicação com o servidor.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    data,
    isLoading,
    refresh: fetchDashboardData
  };
}
