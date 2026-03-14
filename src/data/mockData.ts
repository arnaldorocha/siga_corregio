import { Turma, Curso, Modulo, Aluno, Matricula, ProgressoModulo, Frequencia, Notificacao } from '@/types/academic';

export const turmas: Turma[] = [
  { id: '1', nome: 'Turma A - 2026', ano: 2026, turno: 'Manhã', status: 'Ativa', capacidade_maxima: 30 },
  { id: '2', nome: 'Turma B - 2026', ano: 2026, turno: 'Tarde', status: 'Ativa', capacidade_maxima: 25 },
  { id: '3', nome: 'Turma C - 2026', ano: 2026, turno: 'Noite', status: 'Ativa', capacidade_maxima: 35 },
];

export const cursos: Curso[] = [
  { id: '1', nome: 'Técnico em Enfermagem', carga_horaria_total: 1800, ativo: true },
  { id: '2', nome: 'Técnico em Radiologia', carga_horaria_total: 1200, ativo: true },
  { id: '3', nome: 'Técnico em Segurança do Trabalho', carga_horaria_total: 1200, ativo: true },
];

export const modulos: Modulo[] = [
  { id: '1', nome: 'Anatomia e Fisiologia', carga_horaria: 120, ordem: 1, curso_id: '1' },
  { id: '2', nome: 'Farmacologia', carga_horaria: 80, ordem: 2, curso_id: '1' },
  { id: '3', nome: 'Fundamentos de Enfermagem', carga_horaria: 160, ordem: 3, curso_id: '1' },
  { id: '4', nome: 'Saúde Coletiva', carga_horaria: 100, ordem: 4, curso_id: '1' },
  { id: '5', nome: 'Física das Radiações', carga_horaria: 120, ordem: 1, curso_id: '2' },
  { id: '6', nome: 'Técnicas Radiológicas', carga_horaria: 200, ordem: 2, curso_id: '2' },
  { id: '7', nome: 'Proteção Radiológica', carga_horaria: 80, ordem: 3, curso_id: '2' },
  { id: '8', nome: 'Legislação e Normas', carga_horaria: 100, ordem: 1, curso_id: '3' },
  { id: '9', nome: 'Higiene Ocupacional', carga_horaria: 120, ordem: 2, curso_id: '3' },
];

export const alunos: Aluno[] = [
  { id: '1', nome: 'Maria Silva', telefone: '(11) 99999-0001', email: 'maria@email.com', status: 'Ativo', turma_id: '1' },
  { id: '2', nome: 'João Santos', telefone: '(11) 99999-0002', email: 'joao@email.com', status: 'Ativo', turma_id: '1' },
  { id: '3', nome: 'Ana Oliveira', telefone: '(11) 99999-0003', email: 'ana@email.com', status: 'Ativo', turma_id: '2' },
  { id: '4', nome: 'Carlos Souza', telefone: '(11) 99999-0004', email: 'carlos@email.com', status: 'Ativo', turma_id: '2' },
  { id: '5', nome: 'Beatriz Lima', telefone: '(11) 99999-0005', email: 'beatriz@email.com', status: 'Ativo', turma_id: '3' },
  { id: '6', nome: 'Pedro Costa', telefone: '(11) 99999-0006', email: 'pedro@email.com', status: 'Inativo', turma_id: '1' },
  { id: '7', nome: 'Lucia Mendes', telefone: '(11) 99999-0007', email: 'lucia@email.com', status: 'Ativo', turma_id: '3' },
  { id: '8', nome: 'Fernando Alves', telefone: '(11) 99999-0008', email: 'fernando@email.com', status: 'Ativo', turma_id: '1' },
];

export const matriculas: Matricula[] = [
  { id: '1', aluno_id: '1', curso_id: '1', turma_id: '1', data_inicio: '2026-02-01', status: 'Ativa' },
  { id: '2', aluno_id: '2', curso_id: '1', turma_id: '1', data_inicio: '2026-02-01', status: 'Ativa' },
  { id: '3', aluno_id: '3', curso_id: '2', turma_id: '2', data_inicio: '2026-02-01', status: 'Ativa' },
  { id: '4', aluno_id: '4', curso_id: '2', turma_id: '2', data_inicio: '2026-02-01', status: 'Ativa' },
  { id: '5', aluno_id: '5', curso_id: '3', turma_id: '3', data_inicio: '2026-02-01', status: 'Ativa' },
  { id: '6', aluno_id: '7', curso_id: '3', turma_id: '3', data_inicio: '2026-02-01', status: 'Ativa' },
  { id: '7', aluno_id: '8', curso_id: '1', turma_id: '1', data_inicio: '2026-02-01', status: 'Ativa' },
];

export const progressoModulos: ProgressoModulo[] = [
  { id: '1', matricula_id: '1', modulo_id: '1', data_inicio: '2026-02-01', data_previsao_termino: '2026-03-15', status: 'Em andamento' },
  { id: '2', matricula_id: '1', modulo_id: '2', data_inicio: '2026-03-16', data_previsao_termino: '2026-04-20', status: 'Em andamento' },
  { id: '3', matricula_id: '2', modulo_id: '1', data_inicio: '2026-02-01', data_previsao_termino: '2026-03-10', status: 'Atrasado' },
  { id: '4', matricula_id: '3', modulo_id: '5', data_inicio: '2026-02-01', data_previsao_termino: '2026-03-18', status: 'Em andamento' },
  { id: '5', matricula_id: '5', modulo_id: '8', data_inicio: '2026-02-01', data_previsao_termino: '2026-03-08', status: 'Atrasado' },
];

export const frequencias: Frequencia[] = [
  { id: '1', matricula_id: '1', data: '2026-03-01', presente: true },
  { id: '2', matricula_id: '1', data: '2026-03-02', presente: true },
  { id: '3', matricula_id: '1', data: '2026-03-03', presente: false },
  { id: '4', matricula_id: '2', data: '2026-03-01', presente: true },
  { id: '5', matricula_id: '2', data: '2026-03-02', presente: false },
  { id: '6', matricula_id: '3', data: '2026-03-01', presente: true },
  { id: '7', matricula_id: '4', data: '2026-03-01', presente: false },
  { id: '8', matricula_id: '5', data: '2026-03-01', presente: true },
];

export const notificacoes: Notificacao[] = [
  { id: '1', tipo: 'danger', titulo: 'Módulo Atrasado', mensagem: 'Anatomia e Fisiologia - João Santos está atrasado', data: '2026-03-04', lida: false },
  { id: '2', tipo: 'danger', titulo: 'Módulo Atrasado', mensagem: 'Legislação e Normas - Beatriz Lima está atrasado', data: '2026-03-04', lida: false },
  { id: '3', tipo: 'warning', titulo: 'Vencimento em 7 dias', mensagem: 'Anatomia e Fisiologia - Maria Silva vence em 11/03', data: '2026-03-04', lida: false },
  { id: '4', tipo: 'warning', titulo: 'Vencimento em 14 dias', mensagem: 'Física das Radiações - Ana Oliveira vence em 18/03', data: '2026-03-04', lida: true },
  { id: '5', tipo: 'info', titulo: 'Nova Matrícula', mensagem: 'Fernando Alves matriculado em Técnico em Enfermagem', data: '2026-03-03', lida: true },
];
