import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

interface ParsedTurma {
  nome: string;
  turno: string;
  alunos: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportVagas({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [turmas, setTurmas] = useState<ParsedTurma[]>([]);
  const [importResult, setImportResult] = useState({ turmasCriadas: 0, alunosVinculados: 0, errors: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reset = () => {
    setStep("upload");
    setTurmas([]);
    setImportResult({ turmasCriadas: 0, alunosVinculados: 0, errors: 0 });
  };

  const parseTurno = (nome: string): string => {
    const lower = nome.toLowerCase();
    const hourMatch = lower.match(/(\d{1,2})h/);
    if (hourMatch) {
      const hour = parseInt(hourMatch[1]);
      if (hour < 12) return "Manhã";
      if (hour < 18) return "Tarde";
      return "Noite";
    }
    return "Manhã";
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      const parsed: ParsedTurma[] = [];
      let currentTurma: ParsedTurma | null = null;

      for (const row of json) {
        const firstCell = String(row[0] || "").trim();
        const secondCell = String(row[1] || "").trim();
        const thirdCell = String(row[2] || "").trim();

        // Detect turma headers: patterns like "2886 18h CPD3" or "4200 20h CPD1"
        // They can be in any column
        const allCells = [firstCell, secondCell, thirdCell, String(row[3] || "").trim()];
        for (let ci = 0; ci < allCells.length; ci++) {
          const cell = allCells[ci];
          const turmaMatch = cell.match(/^(\d{3,5})\s+(\d{1,2}h)\s+(CPD\d+)/i);
          if (turmaMatch) {
            if (currentTurma && currentTurma.alunos.length > 0) {
              parsed.push(currentTurma);
            }
            currentTurma = {
              nome: `Turma ${turmaMatch[1]}`,
              turno: parseTurno(cell),
              alunos: [],
            };
          }
        }

        // Detect student names - they are names (letters, spaces, accents) without numbers at start
        if (currentTurma && firstCell && !firstCell.match(/^\d/) && !firstCell.match(/^(SEMPRE|SEGUNDA|TERÇA|QUARTA|QUINTA|SEXTA|SÁBADO|ALUNO|AULA|CURSO|PRECISA|REPOSIÇÃO|RESERVA|VAGA|0000)/i) && firstCell.length > 3) {
          // Clean markdown links
          const cleanName = firstCell.replace(/\[([^\]]+)\]\([^)]+\)/, "$1").trim();
          if (cleanName.match(/^[A-ZÀ-Ü][a-zà-ü]/)) {
            currentTurma.alunos.push(cleanName);
          }
        }
      }
      if (currentTurma && currentTurma.alunos.length > 0) {
        parsed.push(currentTurma);
      }

      setTurmas(parsed);
      setStep("preview");
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    setStep("importing");
    let turmasCriadas = 0;
    let alunosVinculados = 0;
    let errors = 0;

    for (const turma of turmas) {
      // Check if turma already exists
      const { data: existing } = await supabase.from("turmas").select("id").eq("nome", turma.nome).maybeSingle();
      let turmaId: string;

      if (existing) {
        turmaId = existing.id;
      } else {
        const { data: newTurma, error } = await supabase.from("turmas").insert({
          nome: turma.nome,
          turno: turma.turno,
          capacidade_maxima: 12,
          status: "Ativa",
        }).select("id").single();
        if (error) { errors++; continue; }
        turmaId = newTurma.id;
        turmasCriadas++;
      }

      // Link students
      for (const nomeAluno of turma.alunos) {
        // Check if student exists
        const { data: alunoExistente } = await supabase.from("alunos").select("id").ilike("nome", nomeAluno).maybeSingle();
        if (alunoExistente) {
          // Update turma_id
          await supabase.from("alunos").update({ turma_id: turmaId }).eq("id", alunoExistente.id);
          alunosVinculados++;
        } else {
          // Create student
          const { error } = await supabase.from("alunos").insert({ nome: nomeAluno, turma_id: turmaId, status: "Ativo" });
          if (error) errors++;
          else alunosVinculados++;
        }
      }
    }

    setImportResult({ turmasCriadas, alunosVinculados, errors });
    setStep("done");
    queryClient.invalidateQueries({ queryKey: ["turmas"] });
    queryClient.invalidateQueries({ queryKey: ["alunos"] });
    toast({ title: `Importação: ${turmasCriadas} turmas, ${alunosVinculados} alunos` });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar Vagas (Turmas + Alunos)
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Selecione a planilha de vagas (.xlsx)</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            <Button onClick={() => fileRef.current?.click()}>Selecionar Arquivo</Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{turmas.length} turmas encontradas</p>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {turmas.map((t, i) => (
                <div key={i} className="border rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm">{t.nome}</span>
                    <Badge variant="secondary">{t.turno}</Badge>
                    <Badge variant="outline">{t.alunos.length} alunos</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {t.alunos.map((a, j) => (
                      <span key={j} className="text-xs bg-muted px-2 py-0.5 rounded">{a}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={handleImport}>Importar {turmas.length} turmas</Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-muted-foreground">Importando dados...</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Check className="h-12 w-12 text-primary" />
            <p className="font-semibold">{importResult.turmasCriadas} turmas criadas</p>
            <p className="text-sm">{importResult.alunosVinculados} alunos vinculados</p>
            {importResult.errors > 0 && <p className="text-sm text-destructive">{importResult.errors} erros</p>}
            <Button onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
