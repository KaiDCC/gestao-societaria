export interface TipoAlvara {
  id: number;
  nome: string;
}

export interface Alvara {
  id: number;
  empresa_id: number;
  tipo: string;
  responsavel: string;
  responsavel_id?: number | null;
  validade: string | null;
  notificacao_dias: number;
  status: string;
  anexo?: string | null;
  observacoes?: string;
}

