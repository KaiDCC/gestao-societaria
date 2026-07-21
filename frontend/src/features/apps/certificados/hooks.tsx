import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { certificadosApi } from "./services/certificadosApi";

export function useCertificados() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [resumo, setResumo] = useState<any>({ no_prazo: 0, a_vencer: 0, vencidos: 0 });
  const [isLoading, setIsLoading] = useState(false);
  
  const [filtros, setFiltros] = useState<any>({
    query: "",
    status_certificado: "todos",
    status_empresa: "A", 
    sort_by: "validade"
  });

  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await certificadosApi.listar(filtros);
      
      const certificados = data.certificados || [];
      const empresasAgrupadas: Record<string, any> = {};

      certificados.forEach((cert: any) => {
        const cod = cert.empresa_codigo;
        if (!empresasAgrupadas[cod]) {
          empresasAgrupadas[cod] = {
            empresa_codigo: cod,
            empresa_nome: cert.empresa_nome || cert.razao_social,
            empresa_cnpj: cert.cnpj || cert.empresa_cnpj,
            certificados: []
          };
        }
        empresasAgrupadas[cod].certificados.push(cert);
      });

      const empresasArray = Object.values(empresasAgrupadas);

      if (filtros.sort_by === 'validade') {
        empresasArray.sort((a: any, b: any) => {
          const valA = a.certificados[0]?.validade;
          const valB = b.certificados[0]?.validade;
          if (!valA || valA === 'N/A') return 1;
          if (!valB || valB === 'N/A') return -1;
          return valA.localeCompare(valB);
        });
      } else if (filtros.sort_by === 'codigo') {
        empresasArray.sort((a: any, b: any) => 
          String(a.empresa_codigo).localeCompare(String(b.empresa_codigo), undefined, { numeric: true })
        );
      } else {
        empresasArray.sort((a: any, b: any) => String(a.empresa_nome).localeCompare(String(b.empresa_nome)));
      }

      setEmpresas(empresasArray);
      setResumo(data.resumo || { no_prazo: 0, a_vencer: 0, vencidos: 0 });
    } catch (error) {
      toast.error("Erro ao carregar dados do servidor.");
    } finally {
      setIsLoading(false);
    }
  }, [filtros]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const atualizarFiltro = (chave: string, valor: string) => {
    setFiltros((prev: any) => ({ ...prev, [chave]: valor }));
  };

  return { empresas, resumo, isLoading, filtros, atualizarFiltro, recarregar: carregarDados };
}
