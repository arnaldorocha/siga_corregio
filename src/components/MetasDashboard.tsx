import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTable } from "@/hooks/useSupabaseQuery";
import { Target, TrendingDown, RefreshCw, AlertTriangle } from "lucide-react";

// Metas: 8% faltantes (semanal), 2% desistência (mensal), 10% rematrícula (anual)
const METAS = {
  faltantes: { percent: 8, label: "Faltantes", period: "semanal", icon: AlertTriangle },
  desistencia: { percent: 2, label: "Desistência", period: "mensal", icon: TrendingDown },
  rematricula: { percent: 10, label: "Rematrícula", period: "anual", icon: RefreshCw },
};

export default function MetasDashboard() {
  const { data: alunos = [] } = useTable("alunos");
  const { data: matriculas = [] } = useTable("matriculas");
  const { data: frequencias = [] } = useTable("frequencias");

  const stats = useMemo(() => {
    const totalAlunos = alunos.filter((a: any) => a.status === "Ativo").length;
    if (totalAlunos === 0) return null;

    // Faltantes semanal: alunos com faltas nos últimos 7 dias
    const hoje = new Date();
    const seteDiasAtras = new Date(hoje);
    seteDiasAtras.setDate(hoje.getDate() - 7);
    const seteDiasStr = seteDiasAtras.toISOString().split("T")[0];

    const faltasSemana = frequencias.filter(
      (f: any) => !f.presente && f.data >= seteDiasStr
    );
    // Unique matricula_ids with absences
    const matriculasComFalta = new Set(faltasSemana.map((f: any) => f.matricula_id));
    const alunosFaltantes = matriculasComFalta.size;
    const percentFaltantes = totalAlunos > 0 ? (alunosFaltantes / totalAlunos) * 100 : 0;

    // Desistência mensal: matrículas canceladas
    const trintaDiasAtras = new Date(hoje);
    trintaDiasAtras.setDate(hoje.getDate() - 30);
    const trintaDiasStr = trintaDiasAtras.toISOString().split("T")[0];
    const desistencias = matriculas.filter(
      (m: any) => m.status === "Cancelada" && m.updated_at >= trintaDiasStr
    ).length;
    const percentDesistencia = totalAlunos > 0 ? (desistencias / totalAlunos) * 100 : 0;

    // Rematrícula anual: matrículas com matricula_anterior_id (rematriculados)
    const anoAtual = hoje.getFullYear();
    const rematriculas = matriculas.filter(
      (m: any) => m.matricula_anterior_id && new Date(m.created_at).getFullYear() === anoAtual
    ).length;
    const metaRematricula = Math.ceil(totalAlunos * (METAS.rematricula.percent / 100));
    const percentRematricula = totalAlunos > 0 ? (rematriculas / totalAlunos) * 100 : 0;

    return {
      totalAlunos,
      faltantes: { atual: alunosFaltantes, percent: percentFaltantes, meta: Math.ceil(totalAlunos * METAS.faltantes.percent / 100) },
      desistencia: { atual: desistencias, percent: percentDesistencia, meta: Math.ceil(totalAlunos * METAS.desistencia.percent / 100) },
      rematricula: { atual: rematriculas, percent: percentRematricula, meta: metaRematricula },
    };
  }, [alunos, matriculas, frequencias]);

  if (!stats) {
    return (
      <Card className="p-5">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> Metas
        </h3>
        <p className="text-sm text-muted-foreground">Nenhum aluno ativo para calcular metas.</p>
      </Card>
    );
  }

  const metaItems = [
    {
      ...METAS.faltantes,
      atual: stats.faltantes.atual,
      meta: stats.faltantes.meta,
      percentAtual: stats.faltantes.percent,
      ok: stats.faltantes.percent <= METAS.faltantes.percent,
    },
    {
      ...METAS.desistencia,
      atual: stats.desistencia.atual,
      meta: stats.desistencia.meta,
      percentAtual: stats.desistencia.percent,
      ok: stats.desistencia.percent <= METAS.desistencia.percent,
    },
    {
      ...METAS.rematricula,
      atual: stats.rematricula.atual,
      meta: stats.rematricula.meta,
      percentAtual: stats.rematricula.percent,
      ok: stats.rematricula.percent >= METAS.rematricula.percent, // rematrícula: quanto mais, melhor
    },
  ];

  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        Metas — {stats.totalAlunos} alunos ativos
      </h3>
      <div className="space-y-4">
        {metaItems.map((m) => (
          <div key={m.label} className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <m.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{m.label}</span>
                <span className="text-xs text-muted-foreground">({m.period})</span>
              </div>
              <Badge variant={m.ok ? "default" : "destructive"}>
                {m.ok ? "Dentro da meta" : "Fora da meta"}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-muted rounded-full">
                <div
                  className={`h-full rounded-full transition-all ${m.ok ? "bg-primary" : "bg-destructive"}`}
                  style={{ width: `${Math.min(m.percentAtual / (m.percent || 1) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium min-w-[80px] text-right">
                {m.atual}/{m.meta} ({m.percentAtual.toFixed(1)}% / {m.percent}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
