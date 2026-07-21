export interface Empresa {
  id: number;
  codigo_empresa: string;
  nome_emp: string;
  apel_emp: string;
  cnpj: string;
  stat_emp: 'A' | 'I';
  iest_emp?: string | null;
  imun_emp?: string | null;
  dcad_emp?: string | null;
  ijuc_emp?: string | null;
  cida_emp?: string | null;
  esta_emp?: string | null;
  responsavel_empresa?: string | null;
  contato?: string | null;
  email_contato?: string | null;
  telefone_contato?: string | null;
}