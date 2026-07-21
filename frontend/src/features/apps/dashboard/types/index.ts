export interface DashboardCards {
  empresas_ativas: number;
  certificados_vencidos: number;
  alvaras_vencidos: number;
  sem_alvara: number;
  sem_certificado: number;
}

export interface UrgenteItem {
  tipo: string;
  nome: string;
  documento?: string;
  validade: string;
  responsavel?: string; // Para alvarás
}

export interface ProjecaoItem {
  mes_label: string;
  mes: number;
  ano: number;
  certificados: number;
  alvaras: number;
}

export interface MetricaItem {
  nome: string;
  quantidade: number;
}

export interface AusenteItem {
  codigo: string;
  nome: string;
  documento: string;
}

export interface DashboardData {
  cards: DashboardCards;
  urgentes: UrgenteItem[];
  projecao: ProjecaoItem[];
  listas_vencidos: {
    certificados: UrgenteItem[];
    alvaras: UrgenteItem[];
  };
  listas_ausentes: {
    certificados: AusenteItem[];
    alvaras: AusenteItem[];
  };
  alvaras_metricas: {
    por_tipo: MetricaItem[];
    por_responsavel: MetricaItem[];
  };
}

export interface DashboardApiResponse extends DashboardData {
  success: boolean;
  message?: string;
}