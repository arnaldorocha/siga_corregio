import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Users, ClipboardList, AlertTriangle, BookOpen, RefreshCw } from "lucide-react";
import { ImportVagasDialog } from "@/components/import/ImportVagasDialog";
import { ImportLevantamentoDialog } from "@/components/import/ImportLevantamentoDialog";
import { ImportFaltantesDialog } from "@/components/import/ImportFaltantesDialog";
import { ImportPlanejamentoDialog } from "@/components/import/ImportPlanejamentoDialog";
import { ImportRematriculaDialog } from "@/components/import/ImportRematriculaDialog";

const importOptions = [
  {
    key: "vagas",
    title: "Importar Vagas",
    description: "Importa turmas com código, horário, sala e alunos vinculados a partir da planilha de vagas.",
    icon: Users,
  },
  {
    key: "levantamento",
    title: "Importar Levantamento",
    description: "Importa dados dos alunos: nome, data de nascimento, telefone, turma e informações de contato.",
    icon: ClipboardList,
  },
  {
    key: "faltantes",
    title: "Importar Faltantes",
    description: "Importa controle de faltas: aluno, quantidade de faltas, recorrências e observações.",
    icon: AlertTriangle,
  },
  {
    key: "planejamento",
    title: "Importar Planejamento do Aluno",
    description: "Importa módulos, carga horária, previsão de início/término e professor do planejamento individual.",
    icon: BookOpen,
  },
  {
    key: "rematricula",
    title: "Importar Rematrícula",
    description: "Importa planilha de rematrícula com 4 períodos (90, 60, 30, 0 dias): nome, turma, curso indicado, situação e cria notificações.",
    icon: RefreshCw,
  },
];

export default function ImportacaoDados() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6" />
          Importação de Dados
        </h1>
        <p className="page-description">
          Importe planilhas Excel (.xlsx) para cadastrar ou atualizar dados automaticamente no sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {importOptions.map((opt) => (
          <Card key={opt.key} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <opt.icon className="h-5 w-5 text-primary" />
                {opt.title}
              </CardTitle>
              <CardDescription className="text-xs">{opt.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setOpenDialog(opt.key)} className="w-full">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Selecionar Planilha
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <ImportVagasDialog open={openDialog === "vagas"} onOpenChange={(o) => !o && setOpenDialog(null)} />
      <ImportLevantamentoDialog open={openDialog === "levantamento"} onOpenChange={(o) => !o && setOpenDialog(null)} />
      <ImportFaltantesDialog open={openDialog === "faltantes"} onOpenChange={(o) => !o && setOpenDialog(null)} />
      <ImportPlanejamentoDialog open={openDialog === "planejamento"} onOpenChange={(o) => !o && setOpenDialog(null)} />
      <ImportRematriculaDialog open={openDialog === "rematricula"} onOpenChange={(o) => !o && setOpenDialog(null)} />
    </div>
  );
}
