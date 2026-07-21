export interface EmpresaContratante {
  codigo_empresa: string;
  razao_social: string;
  cnpj: string;
  municipio: string;
  uf: string;
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  socio_administrador: string;
  cpf_socio: string;
  tipo_endereco?: string;
  complemento?: string;
}

export interface ContratoPayload {
  tipo_contrato: 'adesao' | 'distrato' | 'distrato_inadimplencia';
  codigo_empresa: string;
  empresa_contratada: string;
  dados_formulario: any;
}
