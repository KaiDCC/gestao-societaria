import { api } from "@/lib/api";

export const certificadosApi = {
  listar: async (filtros: any) => {
    const response = await api.get('/api/certificados', { params: filtros });
    return response.data;
  },

  buscarPorStatus: async (status: string, params: any) => {
    const response = await api.get('/api/certificados/por-status', { 
      params: { status, ...params } 
    });
    return response.data;
  },

  adicionar: async (formData: FormData) => {
    const response = await api.post('/api/certificados', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  editar: async (id: number, formData: FormData) => {
    const response = await api.put(`/api/certificados/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  excluir: async (id: number) => {
    const response = await api.delete(`/api/certificados/${id}`);
    return response.data;
  }
};