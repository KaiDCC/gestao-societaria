import { api } from "@/lib/api";
import type { TipoAlvara } from "../types";

export const alvarasApi = {
  listarTipos: async () => {
    const response = await api.get<{ tipos: TipoAlvara[] }>('/api/alvaras/tipos');
    return response.data;
  },
  
  adicionarTipo: async (nome: string) => {
    const response = await api.post('/api/alvaras/tipos', { nome });
    return response.data;
  },
  
  editarTipo: async (id: number, nome: string) => {
    const response = await api.put(`/api/alvaras/tipos/${id}`, { nome });
    return response.data;
  },
  
  excluirTipo: async (id: number) => {
    const response = await api.delete(`/api/alvaras/tipos/${id}`);
    return response.data;
  },

  listarAlvaras: async (filtros: any) => {
    const params = new URLSearchParams(filtros).toString();
    const response = await api.get(`/api/alvaras?${params}`);
    return response.data;
  }
};
