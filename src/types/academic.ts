export interface Turma {
  id: string;
  nome: string;
  ano: number;
  turno: 'Manhã' | 'Tarde' | 'Noite';
  status: 'Ativa' | 'Inativa' | 'Encerrada';
  capacidade_maxima: number;
}

export interface Curso {
  id: string;
  nome: string;
  carga_horaria_total: number;
  ativo: boolean;
}

export interface Modulo {
  id: string;
  nome: string;
  carga_horaria: number;
  ordem: number;
  curso_id: string;
}

export interface Aluno {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  status: 'Ativo' | 'Inativo' | 'Trancado';
  turma_id: string;
}

export interface Matricula {
  id: string;
  aluno_id: string;
  curso_id: string;
  turma_id: string;
  data_inicio: string;
  status: 'Ativa' | 'Concluída' | 'Cancelada' | 'Trancada';
}

export interface ProgressoModulo {
  id: string;
  matricula_id: string;
  modulo_id: string;
  data_inicio: string;
  data_previsao_termino: string;
  data_real_termino?: string;
  status: 'Em andamento' | 'Concluído' | 'Atrasado';
}

export interface Frequencia {
  id: string;
  matricula_id: string;
  data: string;
  presente: boolean;
}

export interface Notificacao {
  id: string;
  tipo: 'warning' | 'danger' | 'info';
  titulo: string;
  mensagem: string;
  data: string;
  lida: boolean;
}
