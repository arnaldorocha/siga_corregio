import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, GraduationCap, AlertTriangle, XCircle, CalendarX, TrendingUp, BookOpen, UserCog, Filter } from "lucide-react";
import { useTable } from "@/hooks/useSupabaseQuery";
import { useProfessorTurmas, useUserRole } from "@/hooks/useUserRole";
import MetasDashboard from "@/components/MetasDashboard";
import { AniversariosCard } from "@/components/AniversariosCard";
import { DashboardDetailModal } from "@/components/DashboardDetailModal";
import { PieChart, Pie, Cell } from "recharts";
import ParetoChart from "@/components/ui/ParetoChart";

type ModalType = "ativos" | "andamento" | "concluidos" | "atrasados" | "alertas" | "faltas" | "turma_alunos";

export default function Dashboard() {
  const { isAdmin } = useUserRole();
  const { data: alunos = [] } = useTable("alunos");
  const { data: turmas = [] } = useTable("turmas");
  const { data: matriculas = [] } = useTable("matriculas");
  const { data: progressoModulos = [] } = useTable("progresso_modulos");
  const { data: notificacoes = [] } = useTable("notificacoes");
  const { data: frequencias = [] } = useTable("frequencias");
  const { data: professorTurmas = [] } = useTable("professor_turmas");
  const { data: profiles = [] } = useTable("profiles");
  const { data: userRoles = [] } = useTable("user_roles");
  const { filterByTurma, filterAll } = useProfessorTurmas();

  const [filtroProf, setFiltroProf] = useState<string>("todos");
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [modalTurmaId, setModalTurmaId] = useState<string | undefined>();

  // Build professor list for admin filter
  const professores = useMemo(() => {
    const profRoles = userRoles.filter((r: any) => r.role === "professor");
    return profRoles.map((r: any) => {
      const profile = profiles.find((p: any) => p.user_id === r.user_id);
      const ptList = professorTurmas.filter((pt: any) => pt.user_id === r.user_id);
      const turmaIdsList = ptList.map((pt: any) => pt.turma_id);
      const alunoCount = alunos.filter((a: any) => turmaIdsList.includes(a.turma_id)).length;
      return {
        user_id: r.user_id,
        nome: profile?.display_name || "Sem nome",
        turmas: turmaIdsList,
        turmaNames: turmaIdsList.map((tid: string) => turmas.find((t: any) => t.id === tid)?.nome || "—"),
        alunoCount,
      };
    });
  }, [userRoles, profiles, professorTurmas, alunos, turmas]);

  // Apply filters
  const turmasFiltradas = useMemo(() => {
    let base = filterByTurma(turmas, "id");
    if (isAdmin && filtroProf !== "todos") {
      const profTurmaIds = professorTurmas
        .filter((pt: any) => pt.user_id === filtroProf)
        .map((pt: any) => pt.turma_id);
      base = base.filter((t: any) => profTurmaIds.includes(t.id));
    }
    return base;
  }, [turmas, filterByTurma, isAdmin, filtroProf, professorTurmas]);

  const turmaIds = useMemo(() => new Set(turmasFiltradas.map((t: any) => t.id)), [turmasFiltradas]);
  const alunosFiltrados = useMemo(() => alunos.filter((a: any) => filterAll || turmaIds.has(a.turma_id)), [alunos, filterAll, turmaIds]);
  const matriculasFiltradas = useMemo(() => matriculas.filter((m: any) => filterAll || turmaIds.has(m.turma_id)), [matriculas, filterAll, turmaIds]);
  const matriculaIdsFinal = useMemo(() => new Set(matriculasFiltradas.map((m: any) => m.id)), [matriculasFiltradas]);
  const progressoFiltrado = useMemo(() => progressoModulos.filter((p: any) => filterAll || matriculaIdsFinal.has(p.matricula_id)), [progressoModulos, filterAll, matriculaIdsFinal]);
  const frequenciasFiltradas = useMemo(() => frequencias.filter((f: any) => filterAll || matriculaIdsFinal.has(f.matricula_id)), [frequencias, filterAll, matriculaIdsFinal]);

  const alunosAtivos = alunosFiltrados.filter((a: any) => a.status === 'Ativo').length;
  const modulosAtrasados = progressoFiltrado.filter((p: any) => p.status === 'Atrasado').length;
  const modulosAndamento = progressoFiltrado.filter((p: any) => p.status === 'Em andamento').length;
  const modulosConcluidos = progressoFiltrado.filter((p: any) => p.status === 'Concluído').length;
  const faltantes = frequenciasFiltradas.filter((f: any) => !f.presente).length;
  const alertasCount = notificacoes.filter((n: any) => !n.lida).length;

  // Vagas calculation: exclude trancado and EAD
  const vagasPorTurma = turmasFiltradas.map((t: any) => {
    const ocupadas = alunosFiltrados.filter((a: any) => {
      if (a.turma_id !== t.id) return false;
      if (a.status === 'Trancado' || a.status === 'Inativo' || a.status === 'Cancelado' || a.status === 'Finalizado') return false;
      if (a.modalidade === 'EAD') return false;
      return true;
    }).length;
    const prof = professorTurmas.find((pt: any) => pt.turma_id === t.id);
    const profProfile = prof ? profiles.find((p: any) => p.user_id === prof.user_id) : null;
    return { ...t, ocupadas, disponiveis: t.capacidade_maxima - ocupadas, professor: profProfile?.display_name || "—" };
  });

  const alertasRecentes = notificacoes.filter((n: any) => !n.lida).slice(0, 8);

  // Charts data
  const chartData = useMemo(() => {
    const hoje = new Date();
    const totalAtivos = alunosFiltrados.filter((a: any) => a.status === "Ativo").length;
    if (totalAtivos === 0) return null;

    // Faltantes (last 7 days)
    const seteDias = new Date(hoje);
    seteDias.setDate(hoje.getDate() - 7);
    const seteDiasStr = seteDias.toISOString().split("T")[0];
    const faltasSemana = new Set(
      frequenciasFiltradas
        .filter((f: any) => !f.presente && f.data >= seteDiasStr)
        .map((f: any) => f.matricula_id),
    ).size;
    const pctFaltantes = (faltasSemana / totalAtivos) * 100;

    // Desistências (last 30 days)
    const trintaDias = new Date(hoje);
    trintaDias.setDate(hoje.getDate() - 30);
    const trintaDiasStr = trintaDias.toISOString().split("T")[0];
    const desistencias = matriculasFiltradas.filter(
      (m: any) => m.status === "Cancelada" && m.updated_at >= trintaDiasStr,
    ).length;
    const pctDesistencia = (desistencias / totalAtivos) * 100;

    // Rematrículas (current year)
    const anoAtual = hoje.getFullYear();
    const rematriculas = matriculasFiltradas.filter(
      (m: any) => m.matricula_anterior_id && new Date(m.created_at).getFullYear() === anoAtual,
    ).length;
    const pctRematricula = (rematriculas / totalAtivos) * 100;

    // Pareto data para distribuição de status (ativos, trancados, cancelados, concluídos)
    const statusCounts = [
      { name: "Ativos", value: alunosFiltrados.filter((a: any) => a.status === "Ativo").length },
      { name: "Trancados", value: alunosFiltrados.filter((a: any) => a.status === "Trancado").length },
      { name: "Cancelados", value: alunosFiltrados.filter((a: any) => a.status === "Cancelado").length },
      { name: "Concluídos", value: alunosFiltrados.filter((a: any) => a.status === "Finalizado").length },
    ];

    const metaCancelamentosPct = 2; // Meta = 2% do total de alunos ativos
    const metaRematriculaPct = 10; // Meta = 10% do total de alunos ativos

    const statusParetoData = statusCounts
      .slice()
      .sort((a, b) => b.value - a.value)
      .map((item) => ({
        ...item,
        percent: Number(((item.value / totalAtivos) * 100).toFixed(1)),
        metaCancelamentos: metaCancelamentosPct,
        metaRematricula: metaRematriculaPct,
      }));

    return {
      paretoMetaData: [
        {
          name: "Faltantes",
          atual: Number(pctFaltantes.toFixed(1)),
          meta: 8,
          period: "Semanal",
          metaLabel: "Meta semanal",
        },
        {
          name: "Desistência",
          atual: Number(pctDesistencia.toFixed(1)),
          meta: 2,
          period: "Mensal",
          metaLabel: "Meta mensal",
        },
        {
          name: "Rematrícula",
          atual: Number(pctRematricula.toFixed(1)),
          meta: 10,
          period: "Anual / Contrato",
          metaLabel: "Meta anual",
        },
      ],
      statusParetoData,
      faltantesData: {
        name: "Faltantes",
        atual: Number(pctFaltantes.toFixed(1)),
        meta: 8,
        period: "Semanal",
        metaLabel: "Meta semanal",
      },
      pieData: [
        { name: "Ativos", value: statusCounts.find((s) => s.name === "Ativos")!.value, fill: "hsl(var(--primary))" },
        { name: "Trancados", value: statusCounts.find((s) => s.name === "Trancados")!.value, fill: "hsl(var(--warning))" },
        { name: "Cancelados", value: statusCounts.find((s) => s.name === "Cancelados")!.value, fill: "hsl(var(--destructive))" },
        { name: "Concluídos", value: statusCounts.find((s) => s.name === "Concluídos")!.value, fill: "hsl(var(--secondary))" },
      ],
    };
  }, [alunosFiltrados, frequenciasFiltradas, matriculasFiltradas]);

  const openModal = (type: ModalType, tid?: string) => {
    setModalTurmaId(tid);
    setModalType(type);
  };

  const COLORS = ["hsl(var(--secondary))", "hsl(var(--primary))", "hsl(var(--destructive))"];
  const statusColors: Record<string, string> = {
    Ativos: "hsl(var(--primary))",
    Trancados: "hsl(var(--warning))",
    Cancelados: "hsl(var(--destructive))",
    Concluídos: "hsl(var(--secondary))",
  };

  const metaColors: Record<string, string> = {
    Faltantes: "hsl(var(--destructive))",
    Desistências: "hsl(var(--warning))",
    Rematrículas: "hsl(var(--secondary))",
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">
            {isAdmin ? "Painel administrativo — visão geral de todos os professores e turmas" : "Visão geral do sistema acadêmico"}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filtroProf} onValueChange={setFiltroProf}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrar por professor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os professores</SelectItem>
                {professores.map((p: any) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.nome} ({p.alunoCount} alunos)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Admin: Professor summary cards */}
      {isAdmin && filtroProf === "todos" && professores.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <UserCog className="h-4 w-4 text-primary" />
            Professores
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {professores.map((p: any) => (
              <Card
                key={p.user_id}
                className={`p-4 border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${filtroProf === p.user_id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setFiltroProf(p.user_id)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserCog className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.nome}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.turmaNames.length > 0 ? p.turmaNames.join(", ") : "Sem turma"}
                    </p>
                  </div>
                  <div className="ml-auto text-right shrink-0">
                    <p className="text-lg font-bold text-primary">{p.alunoCount}</p>
                    <p className="text-[10px] text-muted-foreground">alunos</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Stats row - clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Alunos Ativos', value: alunosAtivos, icon: GraduationCap, color: 'text-primary', bg: 'bg-primary/10', modal: 'ativos' as ModalType },
          { label: 'Em Andamento', value: modulosAndamento, icon: TrendingUp, color: 'text-secondary', bg: 'bg-secondary/10', modal: 'andamento' as ModalType },
          { label: 'Concluídos', value: modulosConcluidos, icon: BookOpen, color: 'text-success', bg: 'bg-success/10', modal: 'concluidos' as ModalType },
          { label: 'Atrasados', value: modulosAtrasados, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', modal: 'atrasados' as ModalType },
          { label: 'Alertas', value: alertasCount, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', modal: 'alertas' as ModalType },
          { label: 'Faltas', value: faltantes, icon: CalendarX, color: 'text-muted-foreground', bg: 'bg-muted', modal: 'faltas' as ModalType },
        ].map(s => (
          <Card
            key={s.label}
            className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => openModal(s.modal)}
          >
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      {chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <Card className="p-5 border-0 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Pareto - Metas vs Realidade (%)</h3>
              <span className="text-[11px] text-muted-foreground">Meta = linha de referência</span>
            </div>
            <ParetoChart
              data={chartData.paretoMetaData}
              barKey="atual"
              barName="Atual (%)"
              yAxisFormatter={(value) => `${value}%`}
              tooltipFormatter={(value: number, name, props) => {
                const payload = (props as any)?.payload;
                const meta = payload?.payload?.meta;
                return meta
                  ? [`${value}% (Meta: ${meta}%)`, name]
                  : [`${value}%`, name];
              }}
              cellColor={(entry) => metaColors[entry.name] || "hsl(var(--primary))"}
              lines={[
                { dataKey: "meta", name: "Meta (%)", color: "hsl(var(--destructive))" },
              ]}
              referenceLines={[
                { y: 80, label: "Meta Geral (80%)", stroke: "hsl(var(--destructive))" },
              ]}
            />
          </Card>

          <Card className="p-5 border-0 shadow-sm">
            <h3 className="font-semibold mb-4 text-sm">Pareto - Distribuição de Alunos</h3>
            <ParetoChart
              data={chartData.statusParetoData}
              barKey="percent"
              barName="% do total"
              yAxisFormatter={(value) => `${value}%`}
              tooltipFormatter={(value: number, name, props) => {
                const payload = (props as any)?.payload;
                const count = payload?.payload?.value;
                return count
                  ? [`${value}% (${count.toLocaleString()} alunos)`, name]
                  : [`${value}%`, name];
              }}
              cellColor={(entry) => statusColors[entry.name] || "hsl(var(--primary))"}
              lines={[
                { dataKey: "metaCancelamentos", name: "Meta Cancelamentos", color: "hsl(var(--destructive))" },
                { dataKey: "metaRematricula", name: "Meta Rematrícula", color: "hsl(var(--secondary))" },
              ]}
              referenceLines={[
                { y: 2, label: "Meta Cancelamentos (2%)", stroke: "hsl(var(--destructive))" },
                { y: 10, label: "Meta Rematrículas (10%)", stroke: "hsl(var(--secondary))" },
              ]}
            />
          </Card>

          <Card className="p-5 border-0 shadow-sm">
            <h3 className="font-semibold mb-4 text-sm">Faltantes vs Meta (%)</h3>
            <ParetoChart
              data={[chartData.faltantesData]}
              barKey="atual"
              barName="Atual (%)"
              lineKey="meta"
              lineName="Meta (%)"
              yAxisFormatter={(value) => `${value}%`}
            />
          </Card>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Turmas com vagas - clickable */}
        <Card className="p-5 border-0 shadow-sm">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            Turmas & Professores
          </h3>
          <div className="space-y-2">
            {vagasPorTurma.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma turma encontrada.</p>
            ) : vagasPorTurma.map((t: any) => (
              <div
                key={t.id}
                className="p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer"
                onClick={() => openModal("turma_alunos", t.id)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <p className="font-medium text-sm">{t.nome}</p>
                    <p className="text-[11px] text-muted-foreground">{t.turno} · {t.professor === "—" ? "Sem professor" : t.professor}</p>
                  </div>
                  <Badge variant={t.disponiveis > 5 ? 'default' : t.disponiveis > 0 ? 'secondary' : 'destructive'} className="text-[10px]">
                    {t.disponiveis} vagas
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-background rounded-full">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min((t.ocupadas / t.capacidade_maxima) * 100, 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{t.ocupadas}/{t.capacidade_maxima}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Alertas */}
        <Card className="p-5 border-0 shadow-sm cursor-pointer" onClick={() => openModal("alertas")}>
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Alertas Recentes
          </h3>
          {alertasRecentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhum alerta pendente</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {alertasRecentes.map((a: any) => (
                <div key={a.id} className={`p-3 rounded-lg border-l-3 ${
                  a.tipo === 'danger' ? 'border-l-destructive bg-destructive/5' :
                  a.tipo === 'warning' ? 'border-l-warning bg-warning/5' :
                  'border-l-info bg-info/5'
                }`}>
                  <p className="text-xs font-semibold">{a.titulo}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{a.mensagem}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Aniversários */}
        <AniversariosCard />

        {/* Metas */}
        <MetasDashboard />
      </div>

      {/* Detail Modal */}
      <DashboardDetailModal
        open={!!modalType}
        onOpenChange={(o) => { if (!o) { setModalType(null); setModalTurmaId(undefined); } }}
        type={modalType || "ativos"}
        turmaId={modalTurmaId}
        turmaIds={turmaIds}
        matriculaIds={matriculaIdsFinal}
      />
    </div>
  );
}
