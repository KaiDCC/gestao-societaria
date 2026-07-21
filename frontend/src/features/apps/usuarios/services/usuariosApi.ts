// src/features/apps/usuarios/services/usuariosApi.ts
import { api } from "@/lib/api";
import type { UsuarioPayload } from "../types"; 

export const usuariosApi = {
  listarUsuarios: async () => {
    const response = await api.get('/api/usuarios');
    return response.data;
  },

  listarResponsaveis: async () => {
    const response = await api.get('/api/usuarios/responsaveis');
    return response.data;
  },

  criarUsuario: async (dados: UsuarioPayload) => {
    const response = await api.post('/api/usuarios', dados);
    return response.data;
  },

  atualizarUsuario: async (id: number, dados: Partial<UsuarioPayload>) => {
    const response = await api.put(`/api/usuarios/${id}`, dados);
    return response.data;
  },

  excluirUsuario: async (id: number) => {
    const response = await api.delete(`/api/usuarios/${id}`);
    return response.data;
  }
};