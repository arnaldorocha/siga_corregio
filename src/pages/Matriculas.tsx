import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, RefreshCw, FileSpreadsheet, Edit } from "lucide-react";
import { ImportPlanejamento } from "@/components/ImportPlanejamento";
import { useTable } from "@/hooks/useSupabaseQuery";
import { MatriculaModal } from "@/components/modals/MatriculaModal";
import { ProgressoModal } from "@/components/modals/ProgressoModal";
import { MatriculaEditModal } from "@/components/modals/MatriculaEditModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";

export default function Matriculas() {
  const { data: matriculas = [], isLoading } = useTable("matriculas");
  const { data: alunos = [] } = useTable("alunos");
  const { data: cursos = [] } = useTable("cursos");
  const { data: turmas = [] } = useTable("turmas");
  const { data: progressoModulos = [] } = useTable("progresso_modulos");
  const [modalOpen, setModalOpen] = useState(false);
  const [importPlanOpen, setImportPlanOpen] = useState(false);
  const [progressoModalOpen, setProgressoModalOpen] = useState(false);
  const [selectedMatricula, setSelectedMatricula] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMatriculaEdit, setSelectedMatriculaEdit] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canEdit, isAdmin, isCoordenacao, isProfessor } = useUserRole();
  const { turmaIds, filterByTurma: professorTurmas } = useProfessorTurmas();

  const matriculasFiltradas = professorTurmas(matriculas);

  const getAluno = (id: string) => alunos.find((a: any) => a.id === id)?.nome || '-';
  const getCurso = (id: string) => cursos.find((c: any) => c.id === id)?.nome || '-';
  const getTurma = (id: string) => turmas.find((t: any) => t.id === id)?.nome || '-';

  const getProgresso = (matriculaId: string) => {
    const prog = progressoModulos.filter((p: any) => p.matricula_id === matriculaId);
    const concluidos = prog.filter((p: any) => p.status === 'Concluído').length;
    const total = prog.length || 1;
    return { concluidos, total, percent: Math.round((concluidos / total) * 100) };
  };

  const todosConcluidos = (matriculaId: string) => {
    const prog = progressoModulos.filter((p: any) => p.matricula_id === matriculaId);
    return prog.length > 0 && prog.every((p: any) => p.status === 'Concluído');
  };

  const handleRematricula = async () => {
    const ativas = matriculasFiltradas.filter((m: any) => m.status === 'Ativa');
    if (ativas.length === 0) { toast({ title: "Nenhuma matrícula ativa para rematricular" }); return; }
    try {
      for (const m of ativas) {
        await supabase.from("matriculas").update({ status: "Concluída" }).eq("id", m.id);
        await supabase.from("matriculas").insert({
          aluno_id: m.aluno_id, curso_id: m.curso_id, turma_id: m.turma_id,
          data_inicio: new Date().toISOString().split("T")[0], matricula_anterior_id: m.id,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      queryClient.invalidateQueries({ queryKey: ["progresso_modulos"] });
      toast({ title: "Rematrícula gerada!", description: `${ativas.length} matrículas renovadas.` });
    } catch (e: any) {
      toast({ title: "Erro na rematrícula", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Matrículas</h1>
          <p className="page-description">Controle de matrículas e progresso</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportPlanOpen(true)}><FileSpreadsheet className="h-4 w-4 mr-2" />Importar Planejamento</Button>
            <Button variant="outline" onClick={handleRematricula}><RefreshCw className="h-4 w-4 mr-2" />Gerar Rematrícula</Button>
            <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Nova Matrícula</Button>
          </div>
        )}
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead><TableHead>Curso</TableHead><TableHead>Turma</TableHead><TableHead>Data Início</TableHead><TableHead>Progresso</TableHead><TableHead>Status</TableHead><TableHead>Certificado</TableHead><TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow> :
            matriculasFiltradas.map((m: any) => {
              const prog = getProgresso(m.id);
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{getAluno(m.aluno_id)}</TableCell>
                  <TableCell>{getCurso(m.curso_id)}</TableCell>
                  <TableCell className="text-muted-foreground">{getTurma(m.turma_id)}</TableCell>
                  <TableCell>{m.data_inicio ? new Date(m.data_inicio).toLocaleDateString('pt-BR') : '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${prog.percent}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{prog.concluidos}/{prog.total}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.status === 'Ativa' ? 'default' : m.status === 'Concluída' ? 'secondary' : 'destructive'}>{m.status || 'Ativa'}</Badge>
                  </TableCell>
                  <TableCell>
                    {todosConcluidos(m.id) ? (
                      <Button size="sm" variant="outline">Emitir Certificado</Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {(isAdmin || isCoordenacao || (isProfessor && turmaIds.includes(m.turma_id))) && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => { setSelectedMatricula(m.id); setProgressoModalOpen(true); }}
                        >
                          <Edit className="h-4 w-4 mr-2" />Progresso
                        </Button>
                      )}
                      {(isAdmin || isCoordenacao) && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => { setSelectedMatriculaEdit(m); setEditModalOpen(true); }}
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      {canEdit && <MatriculaModal open={modalOpen} onOpenChange={setModalOpen} />}
      {canEdit && <ImportPlanejamento open={importPlanOpen} onOpenChange={setImportPlanOpen} />}
      {(isAdmin || isCoordenacao || isProfessor) && (
        <ProgressoModal 
          open={progressoModalOpen} 
          onOpenChange={setProgressoModalOpen} 
          matriculaId={selectedMatricula}
          canEdit={isAdmin || isCoordenacao || (isProfessor && selectedMatricula ? turmaIds.includes(matriculas.find(m => m.id === selectedMatricula)?.turma_id) : false)}
        />
      )}
      {(isAdmin || isCoordenacao) && (
        <MatriculaEditModal 
          open={editModalOpen} 
          onOpenChange={setEditModalOpen} 
          matricula={selectedMatriculaEdit} 
        />
      )}

    </div>
  );
}
