
export interface Certificado {
  id: number;
  codigo_empresa: string | number;
  empresa_nome?: string;
  empresa_cnpj?: string;
  senha?: string;
  validade: string | null;
  status: 'No Prazo' | 'A Vencer' | 'Vencido' | 'Sem Validade';
  observacoes?: string;
  arquivo?: string;
  arquivo_url?: string;
}

export interface EmpresaComCertificados {
  empresa_codigo: string | number;
  empresa_nome: string;
  empresa_cnpj?: string;
  certificados: Certificado[];
}

export interface ResumoCertificados {
  no_prazo: number;
  a_vencer: number;
  vencidos: number;
}

export interface FiltrosCertificados {
  query: string;
  status_certificado: string;
  status_empresa: string;
  sort_by?: string;
}
