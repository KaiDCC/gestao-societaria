import { api } from "@/lib/api";

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    // Agora aponta para /api/login
    const response = await api.post("/api/login", credentials); 
    return response.data;
  },
  
  register: async (userData: { email: string; name: string; password: string; setor: string }) => {
    // Agora aponta para /api/register
    const response = await api.post("/api/register", userData);
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post("/api/forgot-password", { email });
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/api/logout");
    return response.data;
  },
  resetPassword: async (token: string, password: string) => {
    const response = await api.post("/api/reset-password", { token, password });
    return response.data;
  }
};