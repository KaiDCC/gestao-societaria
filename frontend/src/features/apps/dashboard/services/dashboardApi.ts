import { api } from "@/lib/api";

export const dashboardApi = {
  obterResumo: async () => {
    const response = await api.get("/api/dashboard/resumo");
    return response.data;
  }
};