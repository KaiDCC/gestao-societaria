// src/features/apps/usuarios/hooks.ts
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { usuariosApi } from "./services/usuariosApi";
import type { Usuario } from "./types";

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState("");

  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    try {
      // Chama o arquivo de serviço (usuariosApi) em vez do Axios (api.get) direto
      const [resUsuarios, resResponsaveis] = await Promise.all([
        usuariosApi.listarUsuarios(),
        usuariosApi.listarResponsaveis()
      ]);

      const usuariosData = resUsuarios.usuarios || [];
      const responsaveisData = resResponsaveis.responsaveis || [];

      // Mescla a informação de "em_uso_alvara" para dentro do usuário
      const usuariosMesclados = usuariosData.map((u: any) => {
        const respVinculado = responsaveisData.find((r: any) => r.usuario_id === u.id);
        return {
          ...u,
          em_uso_alvara: respVinculado ? respVinculado.em_uso_alvara : false
        };
      });

      setUsuarios(usuariosMesclados);
    } catch (error: any) {
      const msg = error.response?.data?.message || "Erro ao carregar dados do sistema.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  return {
    usuarios,
    isLoading,
    termoBusca,
    setTermoBusca,
    recarregar: carregarDados
  };
}
