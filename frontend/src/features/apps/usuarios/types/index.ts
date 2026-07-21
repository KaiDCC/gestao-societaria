// src/features/apps/usuarios/types.ts

export interface UsuarioPayload {
  nome: string;
  email: string;
  senha?: string;
  is_admin: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
}

export interface Usuario extends UsuarioPayload {
  id: number;
  responsaveis?: any[];
  em_uso_alvara?: boolean; // Propriedade que nós injetamos no front
}