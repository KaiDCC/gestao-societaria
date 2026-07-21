import { api } from "@/lib/api";
import type { ContratoPayload } from "../types";

export const contratosApi = {
  // GET /api/contratos/buscar-empresa/<codigo_empresa>
  buscarEmpresa: async (codigo: string) => {
    const response = await api.get(`/api/contratos/buscar-empresa/${codigo}`);
    return response.data;
  },
  
  criarContrato: async (payload: ContratoPayload) => {
    const response = await api.post("/api/contratos", payload);
    return response.data;
  },

  listarContratos: async () => {
    const response = await api.get("/api/contratos");
    return response.data;
  },

  obterContrato: async (id: number) => {
    const response = await api.get(`/api/contratos/${id}`);
    return response.data;
  },

  gerarDocx: async (id: number) => {
    const response = await api.post(`/api/contratos/${id}/gerar-docx`);
    return response.data;
  },

  gerarPdf: async (id: number) => {
    const response = await api.post(`/api/contratos/${id}/gerar-pdf`);
    return response.data;
  },

  excluirContrato: async (id: number) => {
    const response = await api.delete(`/api/contratos/${id}`);
    return response.data;
  },

  listarAssessorias: async () => {
    const response = await api.get("/api/assessorias");
    return response.data;
  },

  criarAssessoria: async (payload: any) => {
    const response = await api.post("/api/assessorias", payload);
    return response.data;
  },
  atualizarAssessoria: async (id: number, payload: any) => {
    const response = await api.put(`/api/assessorias/${id}`, payload);
    return response.data;
  }
};