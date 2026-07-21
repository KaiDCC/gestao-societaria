// src/features/apps/ecpf/types/index.ts

export interface EmpresaVinculada {
  codigo_empresa: string | number;
  nome_emp: string;
}

export interface Ecpf {
  id: number;
  cpf: string;
  nome_pessoa: string;
  senha?: string;
  validade?: string;
  status?: string;
  arquivo?: string;
  arquivo_url?: string;
  observacoes?: string;
  codi_emp?: string | number;
  empresa?: string;
  empresas_vinculadas?: EmpresaVinculada[];
}