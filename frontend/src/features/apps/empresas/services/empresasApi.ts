import { api } from "@/lib/api";
import type { Empresa } from "../types";

export const empresasApi = {
  // Lista as empresas com filtro opcional
  listar: async (params?: { status?: string; query?: string; limit?: string }) => {
    const response = await api.get<{ success: boolean; empresas: Empresa[] }>("/api/empresas", { params });
    return response.data;
  },
  
  // Gatilho manual para buscar da Domínio
  sincronizar: async () => {
    const response = await api.post<{ success: boolean; message: string }>("/api/empresas/sincronizar");
    return response.data;
  }
};