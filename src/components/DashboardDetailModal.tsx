import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTable } from "@/hooks/useSupabaseQuery";

type ModalType = "ativos" | "andamento" | "concluidos" | "atrasados" | "alertas" | "faltas" | "turma_alunos";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  type: ModalType;
  turmaId?: string;
  turmaIds?: Set<string>;
  matriculaIds?: Set<string>;
}

export function DashboardDetailModal({ open, onOpenChange, type, turmaId, turmaIds, matriculaIds }: Props) {
  const { data: alunos = [] } = useTable("alunos");
  const { data: turmas = [] } = useTable("turmas");
  const { data: matriculas = [] } = useTable("matriculas");
  const { data: progressoModulos = [] } = useTable("progresso_modulos");
  const { data: modulos = [] } = useTable("modulos");
  const { data: notificacoes = [] } = useTable("notificacoes");
  const { data: frequencias = [] } = useTable("frequencias");

  const getTurmaName = (tid: string) => turmas.find((t: any) => t.id === tid)?.nome || "—";
  const getAlunoName = (aid: string) => alunos.find((a: any) => a.id === aid)?.nome || "—";
  const getModuloName = (mid: string) => modulos.find((m: any) => m.id === mid)?.nome || "—";

  const filteredAlunos = useMemo(() => {
    if (!turmaIds) return alunos;
    return alunos.filter((a: any) => turmaIds.has(a.turma_id));
  }, [alunos, turmaIds]);

  const filteredMatriculas = useMemo(() => {
    if (!matriculaIds) return matriculas;
    return matriculas.filter((m: any) => matriculaIds.has(m.id));
  }, [matriculas, matriculaIds]);

  // Alunos ativos
  const alunosAtivos = useMemo(() =>
    filteredAlunos.filter((a: any) => a.status === "Ativo"),
    [filteredAlunos]
  );

  // Turma alunos
  const turmaAlunos = useMemo(() => {
    if (!turmaId) return [];
    return alunos.filter((a: any) => a.turma_id === turmaId);
  }, [alunos, turmaId]);

  // Progresso filtered
  const progressoFiltered = useMemo(() => {
    if (!matriculaIds) return progressoModulos;
    return progressoModulos.filter((p: any) => matriculaIds.has(p.matricula_id));
  }, [progressoModulos, matriculaIds]);

  // Em andamento - alunos com módulos em andamento
  const alunosAndamento = useMemo(() => {
    const mIds = new Set(progressoFiltered.filter((p: any) => p.status === "Em andamento").map((p: any) => p.matricula_id));
    return filteredMatriculas
      .filter((m: any) => mIds.has(m.id))
      .map((m: any) => {
        const modulo = progressoFiltered.find((p: any) => p.matricula_id === m.id && p.status === "Em andamento");
        return {
          ...m,
          alunoNome: getAlunoName(m.aluno_id),
          turmaNome: getTurmaName(m.turma_id),
          moduloNome: modulo ? getModuloName(modulo.modulo_id) : "—",
          dataInicio: modulo?.data_inicio || "—",
          previsao: modulo?.data_previsao_termino || "—",
        };
      });
  }, [filteredMatriculas, progressoFiltered, alunos, turmas, modulos]);

  // Concluídos
  const alunosConcluidos = useMemo(() => {
    const mIds = new Set(progressoFiltered.filter((p: any) => p.status === "Concluído").map((p: any) => p.matricula_id));
    return filteredMatriculas
      .filter((m: any) => mIds.has(m.id))
      .map((m: any) => {
        const concluidos = progressoFiltered.filter((p: any) => p.matricula_id === m.id && p.status === "Concluído");
        return {
          ...m,
          alunoNome: getAlunoName(m.aluno_id),
          turmaNome: getTurmaName(m.turma_id),
          modulosConcluidos: concluidos.length,
          ultimoModulo: concluidos.length > 0 ? getModuloName(concluidos[concluidos.length - 1].modulo_id) : "—",
        };
      });
  }, [filteredMatriculas, progressoFiltered, alunos, turmas, modulos]);

  // Atrasados
  const alunosAtrasados = useMemo(() => {
    const atrasados = progressoFiltered.filter((p: any) => p.status === "Atrasado");
    return atrasados.map((p: any) => {
      const mat = filteredMatriculas.find((m: any) => m.id === p.matricula_id);
      return {
        ...p,
        alunoNome: mat ? getAlunoName(mat.aluno_id) : "—",
        turmaNome: mat ? getTurmaName(mat.turma_id) : "—",
        moduloNome: getModuloName(p.modulo_id),
      };
    });
  }, [progressoFiltered, filteredMatriculas, alunos, turmas, modulos]);

  // Alertas
  const alertas = useMemo(() =>
    notificacoes.filter((n: any) => !n.lida),
    [notificacoes]
  );

  // Faltas - com contagem e nível
  const faltasDetalhadas = useMemo(() => {
    const freqFiltered = matriculaIds
      ? frequencias.filter((f: any) => matriculaIds.has(f.matricula_id))
      : frequencias;

    // Group by matricula_id
    const faltasPorMatricula: Record<string, { total: number; ultimaFalta: string; motivos: string[] }> = {};
    freqFiltered.filter((f: any) => !f.presente).forEach((f: any) => {
      if (!faltasPorMatricula[f.matricula_id]) {
        faltasPorMatricula[f.matricula_id] = { total: 0, ultimaFalta: "", motivos: [] };
      }
      faltasPorMatricula[f.matricula_id].total++;
      if (f.data > (faltasPorMatricula[f.matricula_id].ultimaFalta || "")) {
        faltasPorMatricula[f.matricula_id].ultimaFalta = f.data;
      }
      if (f.motivo) faltasPorMatricula[f.matricula_id].motivos.push(f.motivo);
    });

    // Check "falta ao vivo": count only absences since last presence
    const faltaAoVivoPorMatricula: Record<string, number> = {};
    Object.keys(faltasPorMatricula).forEach((mId) => {
      const allFreqs = freqFiltered
        .filter((f: any) => f.matricula_id === mId)
        .sort((a: any, b: any) => b.data.localeCompare(a.data));
      let count = 0;
      for (const f of allFreqs) {
        if (f.presente) break;
        count++;
      }
      faltaAoVivoPorMatricula[mId] = count;
    });

    return Object.entries(faltasPorMatricula).map(([mId, info]) => {
      const mat = matriculas.find((m: any) => m.id === mId);
      const aoVivo = faltaAoVivoPorMatricula[mId] || 0;
      let nivel: "normal" | "atencao" | "critico" = "normal";
      if (aoVivo === 2) nivel = "atencao";
      if (aoVivo > 2) nivel = "critico";
      return {
        matriculaId: mId,
        alunoNome: mat ? getAlunoName(mat.aluno_id) : "—",
        turmaNome: mat ? getTurmaName(mat.turma_id) : "—",
        faltasGerais: info.total,
        faltasAoVivo: aoVivo,
        nivel,
        ultimaFalta: info.ultimaFalta,
        motivos: info.motivos,
      };
    }).sort((a, b) => b.faltasAoVivo - a.faltasAoVivo);
  }, [frequencias, matriculas, alunos, turmas, matriculaIds]);

  const nivelBadge = (nivel: string) => {
    if (nivel === "critico") return <Badge variant="destructive">Crítico</Badge>;
    if (nivel === "atencao") return <Badge className="bg-warning text-warning-foreground">Atenção</Badge>;
    return <Badge variant="secondary">Normal</Badge>;
  };

  const titles: Record<ModalType, string> = {
    ativos: "Alunos Ativos",
    andamento: "Módulos Em Andamento",
    concluidos: "Módulos Concluídos",
    atrasados: "Módulos Atrasados",
    alertas: "Alertas Pendentes",
    faltas: "Faltas dos Alunos",
    turma_alunos: `Alunos da Turma${turmaId ? ` - ${getTurmaName(turmaId)}` : ""}`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titles[type]}</DialogTitle>
        </DialogHeader>

        {type === "ativos" && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead><TableHead>Turma</TableHead><TableHead>Modalidade</TableHead><TableHead>Tipo</TableHead><TableHead>Telefone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alunosAtivos.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum aluno ativo</TableCell></TableRow>
              ) : alunosAtivos.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nome}</TableCell>
                  <TableCell>{getTurmaName(a.turma_id)}</TableCell>
                  <TableCell><Badge variant={a.modalidade === "EAD" ? "secondary" : "outline"}>{a.modalidade || "Presencial"}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{a.tipo_aluno || "Normal"}</Badge></TableCell>
                  <TableCell className="text-xs">{a.telefone || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {type === "turma_alunos" && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead><TableHead>Status</TableHead><TableHead>Modalidade</TableHead><TableHead>Tipo</TableHead><TableHead>Telefone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {turmaAlunos.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum aluno nesta turma</TableCell></TableRow>
              ) : turmaAlunos.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nome}</TableCell>
                  <TableCell><Badge variant={a.status === "Ativo" ? "default" : "secondary"}>{a.status}</Badge></TableCell>
                  <TableCell><Badge variant={a.modalidade === "EAD" ? "secondary" : "outline"}>{a.modalidade || "Presencial"}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{a.tipo_aluno || "Normal"}</Badge></TableCell>
                  <TableCell className="text-xs">{a.telefone || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {type === "andamento" && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead><TableHead>Turma</TableHead><TableHead>Módulo</TableHead><TableHead>Início</TableHead><TableHead>Previsão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alunosAndamento.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum em andamento</TableCell></TableRow>
              ) : alunosAndamento.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.alunoNome}</TableCell>
                  <TableCell>{a.turmaNome}</TableCell>
                  <TableCell>{a.moduloNome}</TableCell>
                  <TableCell className="text-xs">{a.dataInicio}</TableCell>
                  <TableCell className="text-xs">{a.previsao}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {type === "concluidos" && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead><TableHead>Turma</TableHead><TableHead>Módulos Concluídos</TableHead><TableHead>Último Módulo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alunosConcluidos.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum concluído</TableCell></TableRow>
              ) : alunosConcluidos.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.alunoNome}</TableCell>
                  <TableCell>{a.turmaNome}</TableCell>
                  <TableCell>{a.modulosConcluidos}</TableCell>
                  <TableCell>{a.ultimoModulo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {type === "atrasados" && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead><TableHead>Turma</TableHead><TableHead>Módulo</TableHead><TableHead>Previsão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alunosAtrasados.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum atrasado</TableCell></TableRow>
              ) : alunosAtrasados.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.alunoNome}</TableCell>
                  <TableCell>{a.turmaNome}</TableCell>
                  <TableCell>{a.moduloNome}</TableCell>
                  <TableCell className="text-xs text-destructive">{a.data_previsao_termino}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {type === "alertas" && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead><TableHead>Título</TableHead><TableHead>Mensagem</TableHead><TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alertas.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum alerta</TableCell></TableRow>
              ) : alertas.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Badge variant={a.tipo === "danger" ? "destructive" : a.tipo === "warning" ? "secondary" : "outline"}>{a.tipo}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{a.titulo}</TableCell>
                  <TableCell className="text-sm">{a.mensagem}</TableCell>
                  <TableCell className="text-xs">{a.data}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {type === "faltas" && (
          <>
            <div className="text-sm text-muted-foreground mb-2">
              <span className="font-medium">Falta ao Vivo:</span> zera quando o aluno retorna. <span className="font-medium">Faltas Gerais:</span> total acumulado.
              <br />1 falta = Normal · 2 faltas = Atenção · 3+ faltas = Crítico
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead><TableHead>Turma</TableHead><TableHead>Faltas ao Vivo</TableHead><TableHead>Faltas Gerais</TableHead><TableHead>Nível</TableHead><TableHead>Última Falta</TableHead><TableHead>Motivos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faltasDetalhadas.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma falta registrada</TableCell></TableRow>
                ) : faltasDetalhadas.map((f) => (
                  <TableRow key={f.matriculaId} className={f.nivel === "critico" ? "bg-destructive/5" : f.nivel === "atencao" ? "bg-warning/5" : ""}>
                    <TableCell className="font-medium">{f.alunoNome}</TableCell>
                    <TableCell>{f.turmaNome}</TableCell>
                    <TableCell className="font-bold">{f.faltasAoVivo}</TableCell>
                    <TableCell>{f.faltasGerais}</TableCell>
                    <TableCell>{nivelBadge(f.nivel)}</TableCell>
                    <TableCell className="text-xs">{f.ultimaFalta}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{f.motivos.length > 0 ? f.motivos.join(", ") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
