import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Check, FolderOpen, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useExcelParser, parseDate } from "./useExcelParser";

interface ParsedModulo {
  materia: string;
  cargaHoraria: number;
  previsaoInicio: string | null;
  previsaoTermino: string | null;
  inicioReal: string | null;
  terminoReal: string | null;
  professor: string;
}

interface ParsedPlanejamento {
  aluno: string;
  turma: string;
  professor: string;
  modulos: ParsedModulo[];
  fileName: string;
}

interface FileResult {
  fileName: string;
  aluno: string;
  status: "pending" | "importing" | "done" | "error";
  modulos: number;
  progresso: number;
  errors: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_\s]+/g, " ").trim();
}

function matchesAny(header: string, aliases: string[]): boolean {
  const h = normalize(header);
  return aliases.some(a => {
    const na = normalize(a);
    return h === na || h.includes(na);
  });
}

export function ImportPlanejamentoDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [plans, setPlans] = useState<ParsedPlanejamento[]>([]);
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const { fileRef, parseFile } = useExcelParser();
  const folderRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const reset = () => { setStep("upload"); setPlans([]); setFileResults([]); };

  const parseOneFile = async (file: File): Promise<ParsedPlanejamento | null> => {
    const rows = await parseFile(file);

    let aluno = "", turma = "", professor = "";
    const modulos: ParsedModulo[] = [];
    let headerFound = false;
    let colMap: Record<string, number> = {};

    for (const row of rows) {
      const cells = row.map((c: any) => String(c || "").trim());

      for (let i = 0; i < cells.length; i++) {
        const lower = normalize(cells[i]);
        if (lower === "aluno" || lower === "aluno(a)" || lower === "nome do aluno") {
          if (cells[i + 1]) aluno = cells[i + 1].trim();
        }
        if (lower === "professor" || lower === "professor(a)") {
          if (cells[i + 1]) professor = cells[i + 1].trim();
        }
        if (lower === "turma" || lower === "codigo turma" || lower === "cod turma") {
          if (cells[i + 1]) turma = cells[i + 1].trim();
        }
      }

      const hasMateria = cells.some(c => matchesAny(c, ["materia", "modulo", "disciplina", "componente"]));
      const hasCH = cells.some(c => matchesAny(c, ["carga", "ch", "horas"]));

      if (hasMateria && hasCH && !headerFound) {
        cells.forEach((c, i) => {
          if (matchesAny(c, ["materia", "modulo", "disciplina", "componente"])) colMap.materia = i;
          if (matchesAny(c, ["carga horaria", "carga", "ch", "horas"])) colMap.ch = i;
          if (matchesAny(c, ["previsao de inicio", "prev inicio", "previsao inicio", "inicio previsto"])) colMap.prevInicio = i;
          if (matchesAny(c, ["previsao de termino", "prev termino", "previsao termino", "termino previsto"])) colMap.prevTermino = i;
          if (matchesAny(c, ["inicio real", "inicio"])) {
            if (colMap.prevInicio !== i) colMap.inicio = i;
          }
          if (matchesAny(c, ["termino real", "termino", "conclusao"])) {
            if (colMap.prevTermino !== i) colMap.termino = i;
          }
          if (matchesAny(c, ["professor"])) colMap.prof = i;
        });
        if (colMap.prevInicio === undefined) {
          cells.forEach((c, i) => {
            if (matchesAny(c, ["inicio"]) && colMap.materia !== i && colMap.ch !== i) colMap.prevInicio = i;
          });
        }
        if (colMap.prevTermino === undefined) {
          cells.forEach((c, i) => {
            if (matchesAny(c, ["termino"]) && colMap.materia !== i && colMap.ch !== i && colMap.prevInicio !== i) colMap.prevTermino = i;
          });
        }
        headerFound = true;
        continue;
      }

      if (!headerFound) continue;

      const matIdx = colMap.materia ?? 0;
      const materia = cells[matIdx];
      if (!materia) continue;
      const materiaLower = normalize(materia);
      if (materiaLower.includes("novas interac") || materiaLower.includes("area da certific") || materiaLower.includes("total")) {
        if (modulos.length > 0) break;
        continue;
      }

      const chIdx = colMap.ch ?? 1;
      const ch = parseInt(cells[chIdx]);
      if (isNaN(ch) || ch === 0) continue;

      const moduloProfessor = (colMap.prof !== undefined ? cells[colMap.prof] : "") || professor;
      modulos.push({
        materia,
        cargaHoraria: ch,
        previsaoInicio: colMap.prevInicio !== undefined ? parseDate(row[colMap.prevInicio]) : null,
        previsaoTermino: colMap.prevTermino !== undefined ? parseDate(row[colMap.prevTermino]) : null,
        inicioReal: colMap.inicio !== undefined ? parseDate(row[colMap.inicio]) : null,
        terminoReal: colMap.termino !== undefined ? parseDate(row[colMap.termino]) : null,
        professor: moduloProfessor,
      });
    }

    if (modulos.length > 0) {
      const firstProf = modulos[0].professor;
      if (firstProf) {
        for (let i = 1; i < modulos.length; i++) {
          if (!modulos[i].professor) modulos[i].professor = firstProf;
        }
      }
    }

    if (modulos.length === 0) return null;
    return { aluno, turma, professor, modulos, fileName: file.name };
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(f =>
      f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
    );

    if (validFiles.length === 0) {
      toast({ title: "Nenhum arquivo .xlsx/.xls encontrado", variant: "destructive" });
      return;
    }

    const parsed: ParsedPlanejamento[] = [];
    for (const file of validFiles) {
      const plan = await parseOneFile(file);
      if (plan) parsed.push(plan);
    }

    if (parsed.length === 0) {
      toast({ title: "Nenhum planejamento válido encontrado nos arquivos", variant: "destructive" });
      return;
    }

    setPlans(parsed);
    setStep("preview");
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files);
  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files);

  const removePlan = (index: number) => {
    const updated = plans.filter((_, i) => i !== index);
    if (updated.length === 0) reset();
    else setPlans(updated);
  };

  const importOnePlan = async (plan: ParsedPlanejamento): Promise<FileResult> => {
    let modulosCriados = 0, progressoCriado = 0, errors = 0;

    const { data: alunoDb } = await supabase.from("alunos").select("id").ilike("nome", plan.aluno).maybeSingle();
    let alunoId: string;
    if (alunoDb) {
      alunoId = alunoDb.id;
    } else {
      const { data: newAluno, error } = await supabase.from("alunos").insert({ nome: plan.aluno, status: "Ativo" }).select("id").single();
      if (error) return { fileName: plan.fileName, aluno: plan.aluno, status: "error", modulos: 0, progresso: 0, errors: 1 };
      alunoId = newAluno.id;
    }

    let cursoId: string | null = null;
    const { data: matriculaExistente } = await supabase.from("matriculas").select("id, curso_id").eq("aluno_id", alunoId).eq("status", "Ativa").maybeSingle();

    if (matriculaExistente) {
      cursoId = matriculaExistente.curso_id;
    } else {
      const cursoNome = `Curso de ${plan.modulos[0]?.materia?.replace(/\s*[Vv]\d+$/, '') || 'Informática'}`;
      const totalCH = plan.modulos.reduce((sum, m) => sum + m.cargaHoraria, 0);
      const { data: cursoExist } = await supabase.from("cursos").select("id").ilike("nome", cursoNome).maybeSingle();
      if (cursoExist) {
        cursoId = cursoExist.id;
      } else {
        const { data: newCurso, error } = await supabase.from("cursos").insert({ nome: cursoNome, carga_horaria_total: totalCH }).select("id").single();
        if (error) errors++;
        else cursoId = newCurso.id;
      }
    }

    if (!cursoId) return { fileName: plan.fileName, aluno: plan.aluno, status: "error", modulos: 0, progresso: 0, errors: errors + 1 };

    let turmaId: string | null = null;
    if (plan.turma) {
      const { data: turmaDb } = await supabase.from("turmas").select("id").ilike("nome", `%${plan.turma}%`).maybeSingle();
      turmaId = turmaDb?.id || null;
    }
    if (!turmaId) {
      const { data: alunoData } = await supabase.from("alunos").select("turma_id").eq("id", alunoId).single();
      turmaId = alunoData?.turma_id || null;
    }
    if (!turmaId) {
      const { data: anyTurma } = await supabase.from("turmas").select("id").eq("status", "Ativa").limit(1).maybeSingle();
      turmaId = anyTurma?.id || null;
    }
    if (!turmaId) return { fileName: plan.fileName, aluno: plan.aluno, status: "error", modulos: 0, progresso: 0, errors: 1 };

    let matriculaId: string;
    if (matriculaExistente) {
      matriculaId = matriculaExistente.id;
    } else {
      const dataInicio = plan.modulos[0]?.previsaoInicio || new Date().toISOString().split("T")[0];
      const { data: newMat, error } = await supabase.from("matriculas").insert({
        aluno_id: alunoId, curso_id: cursoId, turma_id: turmaId, data_inicio: dataInicio,
      }).select("id").single();
      if (error) return { fileName: plan.fileName, aluno: plan.aluno, status: "error", modulos: 0, progresso: 0, errors: 1 };
      matriculaId = newMat.id;
      await supabase.from("progresso_modulos").delete().eq("matricula_id", matriculaId);
    }

    for (let i = 0; i < plan.modulos.length; i++) {
      const m = plan.modulos[i];
      let { data: modDb } = await supabase.from("modulos").select("id").eq("curso_id", cursoId).ilike("nome", m.materia).maybeSingle();

      if (!modDb) {
        const { data: newMod, error } = await supabase.from("modulos").insert({
          nome: m.materia, carga_horaria: m.cargaHoraria, curso_id: cursoId, ordem: i + 1,
        }).select("id").single();
        if (error) { errors++; continue; }
        modDb = newMod;
        modulosCriados++;
      }

      const { data: progExist } = await supabase.from("progresso_modulos").select("id")
        .eq("matricula_id", matriculaId).eq("modulo_id", modDb.id).maybeSingle();

      const status = m.terminoReal ? "Concluído" : "Em andamento";
      if (progExist) {
        await supabase.from("progresso_modulos").update({
          data_inicio: m.previsaoInicio || new Date().toISOString().split("T")[0],
          data_previsao_termino: m.previsaoTermino || new Date().toISOString().split("T")[0],
          data_real_termino: m.terminoReal || null, status,
        }).eq("id", progExist.id);
        progressoCriado++;
      } else {
        const { error } = await supabase.from("progresso_modulos").insert({
          matricula_id: matriculaId, modulo_id: modDb.id,
          data_inicio: m.previsaoInicio || new Date().toISOString().split("T")[0],
          data_previsao_termino: m.previsaoTermino || new Date().toISOString().split("T")[0],
          data_real_termino: m.terminoReal || null, status,
        });
        if (error) errors++;
        else progressoCriado++;
      }
    }

    return { fileName: plan.fileName, aluno: plan.aluno, status: "done", modulos: modulosCriados, progresso: progressoCriado, errors };
  };

  const handleImportAll = async () => {
    setStep("importing");
    const results: FileResult[] = plans.map(p => ({
      fileName: p.fileName, aluno: p.aluno, status: "pending" as const, modulos: 0, progresso: 0, errors: 0,
    }));
    setFileResults([...results]);

    for (let i = 0; i < plans.length; i++) {
      results[i].status = "importing";
      setFileResults([...results]);
      const res = await importOnePlan(plans[i]);
      results[i] = res;
      setFileResults([...results]);
    }

    setStep("done");
    qc.invalidateQueries({ queryKey: ["modulos"] });
    qc.invalidateQueries({ queryKey: ["progresso_modulos"] });
    qc.invalidateQueries({ queryKey: ["matriculas"] });
    qc.invalidateQueries({ queryKey: ["alunos"] });

    const totalMod = results.reduce((s, r) => s + r.modulos, 0);
    const totalProg = results.reduce((s, r) => s + r.progresso, 0);
    const totalErr = results.reduce((s, r) => s + r.errors, 0);
    toast({ title: `${plans.length} planejamentos importados: ${totalMod} módulos, ${totalProg} progressos${totalErr > 0 ? `, ${totalErr} erros` : ""}` });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar Planejamento do Aluno
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-6 py-8">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              Selecione uma ou mais planilhas de planejamento (.xlsx), ou selecione uma pasta inteira.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
            <input
              ref={folderRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFolderInput}
              {...({ webkitdirectory: "true", directory: "" } as any)}
            />
            <div className="flex gap-3">
              <Button onClick={() => fileRef.current?.click()} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Selecionar Arquivos
              </Button>
              <Button variant="outline" onClick={() => folderRef.current?.click()} className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Selecionar Pasta
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && plans.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{plans.length} planejamento(s) carregado(s)</p>
              <Button variant="ghost" size="sm" onClick={reset}>Limpar tudo</Button>
            </div>

            <div className="max-h-[55vh] overflow-auto space-y-3">
              {plans.map((plan, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 flex-wrap items-center">
                      <Badge variant="secondary" className="text-xs">{plan.fileName}</Badge>
                      <Badge variant="outline" className="text-xs">Aluno: {plan.aluno || "?"}</Badge>
                      <Badge variant="outline" className="text-xs">Turma: {plan.turma || "?"}</Badge>
                      <Badge variant="outline" className="text-xs">{plan.modulos.length} módulos</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePlan(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="max-h-32 overflow-auto border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Matéria</TableHead>
                          <TableHead className="text-xs">CH</TableHead>
                          <TableHead className="text-xs">Prev. Início</TableHead>
                          <TableHead className="text-xs">Prev. Término</TableHead>
                          <TableHead className="text-xs">Professor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plan.modulos.map((m, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs font-medium">{m.materia}</TableCell>
                            <TableCell className="text-xs">{m.cargaHoraria}h</TableCell>
                            <TableCell className="text-xs">{m.previsaoInicio || "—"}</TableCell>
                            <TableCell className="text-xs">{m.previsaoTermino || "—"}</TableCell>
                            <TableCell className="text-xs">{m.professor || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={handleImportAll}>
                Importar {plans.length} Planejamento(s)
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 py-4">
            <p className="text-sm font-medium text-center">Importando planejamentos...</p>
            <div className="space-y-2">
              {fileResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-2 border rounded text-sm">
                  {r.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-muted" />}
                  {r.status === "importing" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  {r.status === "done" && <Check className="h-4 w-4 text-primary" />}
                  {r.status === "error" && <X className="h-4 w-4 text-destructive" />}
                  <span className="flex-1 truncate">{r.aluno || r.fileName}</span>
                  {r.status === "done" && (
                    <span className="text-xs text-muted-foreground">{r.modulos} mód, {r.progresso} prog</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-2">
              <Check className="h-12 w-12 text-primary" />
              <p className="font-semibold">Importação concluída</p>
            </div>
            <div className="space-y-2">
              {fileResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-2 border rounded text-sm">
                  {r.status === "done" ? <Check className="h-4 w-4 text-primary" /> : <X className="h-4 w-4 text-destructive" />}
                  <span className="flex-1 truncate">{r.aluno || r.fileName}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.modulos} módulos, {r.progresso} progressos
                    {r.errors > 0 && <span className="text-destructive ml-1">({r.errors} erros)</span>}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-center">
              <Button onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
