import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useTable } from "@/hooks/useSupabaseQuery";
import * as XLSX from "xlsx";

interface ParsedModulo {
  nome: string;
  cargaHoraria: number;
  previsaoInicio: string;
  previsaoTermino: string;
  inicioReal?: string;
  terminoReal?: string;
}

interface ParsedPlanejamento {
  nomeAluno: string;
  turma: string;
  modulos: ParsedModulo[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseExcelDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split("T")[0];
  const str = String(val).trim();
  const parts = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (parts) return `${parts[3]}-${parts[2]}-${parts[1]}`;
  return null;
}

export function ImportPlanejamento({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<"upload" | "preview" | "select" | "importing" | "done">("upload");
  const [planejamento, setPlanejamento] = useState<ParsedPlanejamento | null>(null);
  const [selectedAlunoId, setSelectedAlunoId] = useState("");
  const [selectedCursoId, setSelectedCursoId] = useState("");
  const [importResult, setImportResult] = useState({ modulos: 0, progresso: 0, errors: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: alunos = [] } = useTable("alunos");
  const { data: cursos = [] } = useTable("cursos");
  const { data: matriculas = [] } = useTable("matriculas");

  const reset = () => {
    setStep("upload");
    setPlanejamento(null);
    setSelectedAlunoId("");
    setSelectedCursoId("");
    setImportResult({ modulos: 0, progresso: 0, errors: 0 });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      let nomeAluno = "";
      let turma = "";
      const modulos: ParsedModulo[] = [];

      for (const row of json) {
        const cells = row.map((c: any) => String(c).trim());

        // Find student name: row starts with "Aluno"
        if (cells[0]?.toLowerCase() === "aluno") {
          nomeAluno = cells[1] || "";
        }
        // Find turma
        if (cells.some((c: string) => c.toLowerCase() === "turma")) {
          const idx = cells.findIndex((c: string) => c.toLowerCase() === "turma");
          turma = cells[idx + 1] || "";
        }

        // Module rows: have a carga_horaria number in column 1 and a name in column 0
        if (cells[0] && cells[1] && !isNaN(Number(cells[1])) && Number(cells[1]) > 0 && cells[0].toLowerCase() !== "matéria" && cells[0].toLowerCase() !== "carga horária") {
          const ch = Number(cells[1]);
          if (ch > 0 && ch < 200 && cells[0].length > 2) {
            modulos.push({
              nome: cells[0],
              cargaHoraria: ch,
              previsaoInicio: parseExcelDate(row[3]) || "",
              previsaoTermino: parseExcelDate(row[4]) || "",
              inicioReal: parseExcelDate(row[5]) || undefined,
              terminoReal: parseExcelDate(row[7]) || undefined,
            });
          }
        }
      }

      if (modulos.length === 0) {
        toast({ title: "Nenhum módulo encontrado na planilha", variant: "destructive" });
        return;
      }

      setPlanejamento({ nomeAluno, turma, modulos });

      // Try auto-match student
      const match = alunos.find((a: any) =>
        a.nome.toLowerCase().includes(nomeAluno.toLowerCase().split(" ")[0]) ||
        nomeAluno.toLowerCase().includes(a.nome.toLowerCase().split(" ")[0])
      );
      if (match) setSelectedAlunoId((match as any).id);

      setStep("preview");
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!selectedAlunoId || !selectedCursoId || !planejamento) return;
    setStep("importing");

    let modulosCriados = 0;
    let progressoCriado = 0;
    let errors = 0;

    // Find or create matricula
    let matricula = matriculas.find((m: any) =>
      m.aluno_id === selectedAlunoId && m.curso_id === selectedCursoId && m.status === "Ativa"
    ) as any;

    if (!matricula) {
      const aluno = alunos.find((a: any) => a.id === selectedAlunoId) as any;
      const { data: newMat, error } = await supabase.from("matriculas").insert({
        aluno_id: selectedAlunoId,
        curso_id: selectedCursoId,
        turma_id: aluno?.turma_id || "",
        status: "Ativa",
      }).select().single();
      if (error) {
        toast({ title: "Erro ao criar matrícula", description: error.message, variant: "destructive" });
        setStep("preview");
        return;
      }
      matricula = newMat;
    }

    // Get existing modules for this course
    const { data: existingModulos } = await supabase.from("modulos").select("id, nome").eq("curso_id", selectedCursoId);
    const existingMap = new Map((existingModulos || []).map((m: any) => [m.nome.toLowerCase(), m.id]));

    // Delete existing progress for this matricula to recreate
    await supabase.from("progresso_modulos").delete().eq("matricula_id", matricula.id);

    for (let i = 0; i < planejamento.modulos.length; i++) {
      const mod = planejamento.modulos[i];
      let moduloId = existingMap.get(mod.nome.toLowerCase());

      if (!moduloId) {
        const { data: newMod, error } = await supabase.from("modulos").insert({
          nome: mod.nome,
          carga_horaria: mod.cargaHoraria,
          curso_id: selectedCursoId,
          ordem: i + 1,
        }).select("id").single();
        if (error) { errors++; continue; }
        moduloId = newMod.id;
        modulosCriados++;
      }

      // Create progress
      const status = mod.terminoReal ? "Concluído" : "Em andamento";
      const { error: errProg } = await supabase.from("progresso_modulos").insert({
        matricula_id: matricula.id,
        modulo_id: moduloId,
        data_inicio: mod.inicioReal || mod.previsaoInicio || new Date().toISOString().split("T")[0],
        data_previsao_termino: mod.previsaoTermino || mod.previsaoInicio || new Date().toISOString().split("T")[0],
        data_real_termino: mod.terminoReal || null,
        status,
      });
      if (errProg) errors++;
      else progressoCriado++;
    }

    setImportResult({ modulos: modulosCriados, progresso: progressoCriado, errors });
    setStep("done");
    queryClient.invalidateQueries({ queryKey: ["modulos"] });
    queryClient.invalidateQueries({ queryKey: ["progresso_modulos"] });
    queryClient.invalidateQueries({ queryKey: ["matriculas"] });
    toast({ title: `Planejamento importado: ${modulosCriados} módulos, ${progressoCriado} progressos` });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar Planejamento de Aluno
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Selecione a planilha de planejamento (.xlsx)</p>
            <p className="text-xs text-muted-foreground">Ex: Ketlin_Miria_..._Administração.xlsx</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            <Button onClick={() => fileRef.current?.click()}>Selecionar Arquivo</Button>
          </div>
        )}

        {step === "preview" && planejamento && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Aluno detectado: <strong>{planejamento.nomeAluno || "—"}</strong></p>
                <label className="text-sm font-medium mb-1 block">Vincular ao aluno:</label>
                <Select value={selectedAlunoId} onValueChange={setSelectedAlunoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o aluno..." /></SelectTrigger>
                  <SelectContent>
                    {alunos.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Turma: {planejamento.turma || "—"}</p>
                <label className="text-sm font-medium mb-1 block">Curso:</label>
                <Select value={selectedCursoId} onValueChange={setSelectedCursoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o curso..." /></SelectTrigger>
                  <SelectContent>
                    {cursos.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-sm font-medium">{planejamento.modulos.length} módulos encontrados:</p>
            <div className="max-h-52 overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead>CH</TableHead>
                    <TableHead>Prev. Início</TableHead>
                    <TableHead>Prev. Término</TableHead>
                    <TableHead>Início Real</TableHead>
                    <TableHead>Término Real</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planejamento.modulos.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{m.nome}</TableCell>
                      <TableCell className="text-xs">{m.cargaHoraria}h</TableCell>
                      <TableCell className="text-xs">{m.previsaoInicio || "—"}</TableCell>
                      <TableCell className="text-xs">{m.previsaoTermino || "—"}</TableCell>
                      <TableCell className="text-xs">{m.inicioReal || "—"}</TableCell>
                      <TableCell className="text-xs">{m.terminoReal || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={handleImport} disabled={!selectedAlunoId || !selectedCursoId}>
                Importar Planejamento
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-muted-foreground">Importando planejamento...</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Check className="h-12 w-12 text-primary" />
            <p className="font-semibold">{importResult.modulos} módulos criados</p>
            <p className="text-sm">{importResult.progresso} progressos registrados</p>
            {importResult.errors > 0 && <p className="text-sm text-destructive">{importResult.errors} erros</p>}
            <Button onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
