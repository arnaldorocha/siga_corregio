import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useExcelParser, cleanName, getTipoAlunoFromColor } from "./useExcelParser";
import * as XLSX from "xlsx";

interface ParsedAluno {
  nome: string;
  tipo: string;
  modalidade: string;
}

interface ParsedTurma {
  codigo: string;
  horario: string;
  sala: string;
  turno: string;
  diaSemana: string;
  alunos: ParsedAluno[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DIAS_MAP: Record<string, string> = {
  "SEGUNDA": "Segunda-feira",
  "TERÇA": "Terça-feira",
  "QUARTA": "Quarta-feira",
  "QUINTA": "Quinta-feira",
  "SEXTA": "Sexta-feira",
  "SÁBADO": "Sábado",
  "SABADO": "Sábado",
  "DOMINGO": "Domingo",
};

const IGNORE_PATTERNS = /^(SEMPRE|ALUNO|AULA|CURSO|PRECISA|REPOSIÇÃO|RESERVA|VAGA|0000|ATÍPICO|TRANSFERÊNCIA|EAD|DIGITAÇÃO|INTENSIVO|NOVO|PRESENCIAL|TRANCADO|EXPERIMENTAL|SENIOR|TURMA|CPD|SALA|HORÁRIO|PROFESSOR|CONTROLE|MATRÍCULA|OBSERVA|LEGENDA|COLABORADOR|NORMAL)/i;

function parseTurno(horario: string): string {
  const h = parseInt(horario);
  if (isNaN(h)) return "Manhã";
  if (h < 12) return "Manhã";
  if (h < 18) return "Tarde";
  return "Noite";
}

function detectDia(cell: string): string | null {
  const upper = cell.toUpperCase().trim();
  for (const [key, value] of Object.entries(DIAS_MAP)) {
    if (upper.includes(key)) return value;
  }
  return null;
}

const TIPO_COLORS: Record<string, string> = {
  "Normal": "bg-blue-800 text-white",
  "Reposição": "bg-cyan-300 text-black",
  "Transferência": "bg-blue-100 text-black",
  "EAD": "bg-gray-300 text-white",
  "Reserva": "bg-yellow-300 text-black",
  "Colaborador": "bg-purple-600 text-white",
};

export function ImportVagasDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [turmas, setTurmas] = useState<ParsedTurma[]>([]);
  const [result, setResult] = useState({ turmas: 0, alunos: 0, errors: 0 });
  const { fileRef } = useExcelParser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const reset = () => { setStep("upload"); setTurmas([]); setResult({ turmas: 0, alunos: 0, errors: 0 }); };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary", cellDates: true, cellStyles: true });
        const parsed: ParsedTurma[] = [];

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

          let currentDia = "";
          let current: ParsedTurma | null = null;

          for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            const cells = row.map((c: any) => String(c || "").trim());

            // 1. Detect day-of-week headers (usually top rows)
            for (const cell of cells) {
              const dia = detectDia(cell);
              if (dia) {
                currentDia = dia;
              }
            }

            // 2. Detect turma pattern: "2886 18h CPD3", "2886 18h", etc
            for (const cell of cells) {
              // Code + hour + optional room
              let match = cell.match(/^(\d{3,5})\s+(\d{1,2})h?\s+([A-Za-z]+\d*)/i);
              if (!match) {
                match = cell.match(/^(\d{3,5})\s+(\d{1,2})h/i);
              }
              if (match) {
                const code = match[1];
                const hour = match[2];
                const room = match[3] || "";
                // Skip dates/years
                if (code.length === 4 && parseInt(code) > 2020 && parseInt(code) < 2030) continue;

                if (current && current.alunos.length > 0) parsed.push(current);
                current = {
                  codigo: code,
                  horario: hour + "h",
                  sala: room.toUpperCase(),
                  turno: parseTurno(hour),
                  diaSemana: currentDia,
                  alunos: [],
                };
              }
            }

            // 3. Detect student names with color-based type
            if (current) {
              for (let c = 0; c <= range.e.c; c++) {
                const cellVal = cells[c] || "";
                const trimmed = cellVal.trim();
                if (!trimmed || trimmed.length < 4) continue;
                if (trimmed.match(/^\d/)) continue;
                if (IGNORE_PATTERNS.test(trimmed)) continue;
                if (trimmed.match(/^\d{3,5}\s+\d/)) continue;
                if (trimmed.match(/^[A-Z\s]+$/) && trimmed.length < 5) continue;

                const name = cleanName(trimmed);
                if (name.length > 3 && name.match(/^[A-ZÀ-Ü]/i) && name.includes(" ")) {
                  // Get cell style for color detection
                  const addr = XLSX.utils.encode_cell({ r, c });
                  const cellObj = ws[addr];
                  const style = cellObj?.s;

                  let tipoInfo = getTipoAlunoFromColor(style);

                  // Also check text content for type hints
                  const lowerName = name.toLowerCase();
                  if (lowerName.includes("(ead)") || lowerName.includes(" ead")) {
                    tipoInfo = { tipo: "EAD", modalidade: "EAD" };
                  } else if (lowerName.includes("(repos") || lowerName.includes("reposiç")) {
                    tipoInfo = { tipo: "Reposição", modalidade: "Presencial" };
                  } else if (lowerName.includes("(transf") || lowerName.includes("transferên")) {
                    tipoInfo = { tipo: "Transferência", modalidade: "Presencial" };
                  }

                  // Clean the name from type annotations
                  const cleanedName = name
                    .replace(/\s*\(ead\)\s*/i, "")
                    .replace(/\s*\(reposiç[ãa]o\)\s*/i, "")
                    .replace(/\s*\(transfer[eê]ncia\)\s*/i, "")
                    .replace(/\s*\(reserva\)\s*/i, "")
                    .replace(/\s*\(colaborador\)\s*/i, "")
                    .trim();

                  if (!current.alunos.some(a => a.nome.toLowerCase() === cleanedName.toLowerCase())) {
                    current.alunos.push({
                      nome: cleanedName,
                      tipo: tipoInfo.tipo,
                      modalidade: tipoInfo.modalidade,
                    });
                  }
                }
              }
            }
          }
          if (current && current.alunos.length > 0) parsed.push(current);
        }

        setTurmas(parsed.filter(t => t.codigo !== "0000"));
        setStep("preview");
      } catch (err) {
        console.error("Erro ao parsear:", err);
        toast({ title: "Erro ao ler planilha", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    setStep("importing");
    let tc = 0, ac = 0, errors = 0;

    for (const t of turmas) {
      const nome = `Turma ${t.codigo}`;
      const { data: existing } = await supabase.from("turmas").select("id").eq("nome", nome).maybeSingle();
      let turmaId: string;

      if (existing) {
        // Update dia_semana and horario
        await supabase.from("turmas").update({
          dia_semana: t.diaSemana || null,
          horario: t.horario || null,
          turno: t.turno,
        }).eq("id", existing.id);
        turmaId = existing.id;
      } else {
        const { data: newT, error } = await supabase.from("turmas").insert({
          nome, turno: t.turno, capacidade_maxima: 12, status: "Ativa",
          dia_semana: t.diaSemana || null, horario: t.horario || null,
        }).select("id").single();
        if (error) { errors++; continue; }
        turmaId = newT.id;
        tc++;
      }

      for (const aluno of t.alunos) {
        const { data: alunoDb } = await supabase.from("alunos").select("id").ilike("nome", aluno.nome).maybeSingle();
        if (alunoDb) {
          await supabase.from("alunos").update({
            turma_id: turmaId,
            tipo_aluno: aluno.tipo,
            modalidade: aluno.modalidade,
          }).eq("id", alunoDb.id);
          ac++;
        } else {
          const { error } = await supabase.from("alunos").insert({
            nome: aluno.nome,
            turma_id: turmaId,
            status: "Ativo",
            tipo_aluno: aluno.tipo,
            modalidade: aluno.modalidade,
          });
          if (error) errors++; else ac++;
        }
      }
    }

    setResult({ turmas: tc, alunos: ac, errors });
    setStep("done");
    qc.invalidateQueries({ queryKey: ["turmas"] });
    qc.invalidateQueries({ queryKey: ["alunos"] });
    toast({ title: `Importação: ${tc} turmas, ${ac} alunos` });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar Vagas
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Selecione a planilha de vagas (.xlsx)</p>
            <div className="text-xs text-muted-foreground space-y-1 text-center max-w-md">
              <p>O sistema lê automaticamente: dia da semana, código da turma, horário, sala e alunos.</p>
              <p>Tipo do aluno detectado pela cor da célula:</p>
              <div className="flex flex-wrap gap-1 justify-center mt-2">
                {Object.entries(TIPO_COLORS).map(([tipo, cls]) => (
                  <span key={tipo} className={`px-2 py-0.5 rounded text-xs ${cls}`}>{tipo}</span>
                ))}
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            <Button onClick={() => fileRef.current?.click()}>Selecionar Arquivo</Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{turmas.length} turmas encontradas — {turmas.reduce((s, t) => s + t.alunos.length, 0)} alunos</p>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {turmas.map((t, i) => (
                <div key={i} className="border rounded p-3">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-semibold text-sm">Turma {t.codigo}</span>
                    <Badge variant="secondary">{t.horario}</Badge>
                    {t.sala && <Badge variant="outline">{t.sala}</Badge>}
                    <Badge variant="outline">{t.turno}</Badge>
                    {t.diaSemana && <Badge>{t.diaSemana}</Badge>}
                    <Badge>{t.alunos.length} alunos</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {t.alunos.map((a, j) => (
                      <span key={j} className={`text-xs px-2 py-0.5 rounded ${TIPO_COLORS[a.tipo] || "bg-muted"}`}>
                        {a.nome} {a.tipo !== "Normal" ? `(${a.tipo})` : ""}
                      </span>
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
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            <p className="text-sm text-muted-foreground">Importando dados...</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Check className="h-12 w-12 text-primary" />
            <p className="font-semibold">{result.turmas} turmas criadas</p>
            <p className="text-sm">{result.alunos} alunos vinculados</p>
            {result.errors > 0 && <p className="text-sm text-destructive">{result.errors} erros</p>}
            <Button onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
