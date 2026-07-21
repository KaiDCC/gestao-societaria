// src/features/apps/ecpf/services/ecpfApi.ts
import { api } from "@/lib/api";

export const ecpfApi = {
  // Busca todos os e-CPFs com os filtros passados na URL
  listar: async (params: URLSearchParams) => {
    const response = await api.get(`/api/ecpfs?${params.toString()}`);
    return response.data;
  },

  // Busca e-CPFs específicos de um status (usado no modal de status)
  porStatus: async (status: string, empresaVinculada: string) => {
    const response = await api.get('/api/ecpfs/por-status', { 
      params: { status, empresa_vinculada: empresaVinculada } 
    });
    return response.data;
  },

  // Adiciona novo e-CPF enviando FormData (por causa do arquivo .pfx)
  adicionar: async (formData: FormData) => {
    const response = await api.post('/api/ecpfs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Edita e-CPF
  editar: async (id: number, formData: FormData) => {
    const response = await api.put(`/api/ecpfs/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Exclui e-CPF
  excluir: async (id: number) => {
    const response = await api.delete(`/api/ecpfs/${id}`);
    return response.data;
  },

  // Busca lista de empresas associadas a um CPF específico
  buscarEmpresasPorCpf: async (cpf: string) => {
    const response = await api.get(`/api/ecpfs/buscar-codi-emp-por-cpf?cpf=${cpf}`);
    return response.data;
  },

  // Helper para gerar a URL de exportação para o Excel de forma limpa
  getExportUrl: (params: string) => {
    return `${api.defaults.baseURL || ''}/api/ecpfs/exportar?${params}`;
  }
};