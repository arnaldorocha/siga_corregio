import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ArrowRightLeft, Upload, Trash2, Search, Pencil, Calendar } from "lucide-react";
import { useTable, useDelete } from "@/hooks/useSupabaseQuery";
import { AlunoModal } from "@/components/modals/AlunoModal";
import { ImportExcel } from "@/components/ImportExcel";
import { useUserRole, useProfessorTurmas } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface AlunosProps {
  title?: string;
  description?: string;
  showImport?: boolean;
}

export default function Alunos({
  title = "Alunos",
  description = "Cadastro e gerenciamento de alunos",
  showImport = true,
}: AlunosProps) {
  const { data: alunos = [], isLoading } = useTable("alunos");
  const { data: turmas = [] } = useTable("turmas");
  const { data: matriculas = [] } = useTable("matriculas");
  const { data: cursos = [] } = useTable("cursos");
  const { data: modulos = [] } = useTable("modulos");
  const { data: progressoModulos = [] } = useTable("progresso_modulos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [transferModal, setTransferModal] = useState<any>(null);
  const [newTurmaId, setNewTurmaId] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [datasModal, setDatasModal] = useState<any>(null);
  const { canEdit, isProfessor } = useUserRole();
  const { filterByTurma, loaded: turmasLoaded, turmaIds } = useProfessorTurmas();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteAluno = useDelete("alunos");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTurma, setFilterTurma] = useState("all");
  const [filterModalidade, setFilterModalidade] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const cursosById = useMemo(() => {
    return (cursos || []).reduce((acc: Record<string, any>, curso: any) => {
      acc[curso.id] = curso;
      return acc;
    }, {});
  }, [cursos]);

  const modulosById = useMemo(() => {
    return (modulos || []).reduce((acc: Record<string, any>, modulo: any) => {
      acc[modulo.id] = modulo;
      return acc;
    }, {});
  }, [modulos]);

  const matriculaByAlunoId = useMemo(() => {
    const map: Record<string, any> = {};
    (matriculas || []).forEach((m: any) => {
      if (m.status === "Ativa") {
        map[m.aluno_id] = m;
      }
    });
    return map;
  }, [matriculas]);

  const progressoByMatriculaId = useMemo(() => {
    const map: Record<string, any[]> = {};
    (progressoModulos || []).forEach((p: any) => {
      if (!map[p.matricula_id]) map[p.matricula_id] = [];
      map[p.matricula_id].push(p);
    });
    return map;
  }, [progressoModulos]);

  const alunosFiltrados = useMemo(() => {
    if (!turmasLoaded) return [];
    return filterByTurma(alunos).filter((a: any) => {
      if (searchTerm && !a.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterTurma !== "all" && a.turma_id !== filterTurma) return false;
      if (filterModalidade !== "all" && (a.modalidade || "Presencial") !== filterModalidade) return false;
      if (filterTipo !== "all" && (a.tipo_aluno || "Normal") !== filterTipo) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      return true;
    });
  }, [alunos, searchTerm, filterTurma, filterModalidade, filterTipo, filterStatus, turmasLoaded, filterByTurma]);

  const getTurmaNome = (id: string) => turmas.find((t: any) => t.id === id)?.nome || '-';

  const handleTransfer = async () => {
    if (!transferModal || !newTurmaId) return;
    try {
      await supabase.from("alunos").update({ turma_id: newTurmaId }).eq("id", transferModal.id);
      const mat = matriculas.find((m: any) => m.aluno_id === transferModal.id && m.status === "Ativa");
      if (mat) {
        await supabase.from("matriculas").update({ turma_id: newTurmaId }).eq("id", mat.id);
      }
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      toast({ title: "Transferência realizada!", description: `${transferModal.nome} transferido para ${getTurmaNome(newTurmaId)}` });
      setTransferModal(null);
      setNewTurmaId("");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = (e: React.MouseEvent, aluno: any) => {
    e.stopPropagation();
    if (confirm(`Excluir aluno "${aluno.nome}"?`)) {
      deleteAluno.mutate(aluno.id);
    }
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-description">{description}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {showImport && <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-2" />Importar Excel</Button>}
            <Button onClick={() => { setEditData(null); setModalOpen(true); }}><Plus className="h-4 w-4 mr-2" />Novo Aluno</Button>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar aluno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterTurma} onValueChange={setFilterTurma}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Turma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas turmas</SelectItem>
            {turmas.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterModalidade} onValueChange={setFilterModalidade}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Modalidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="Presencial">Presencial</SelectItem>
            <SelectItem value="EAD">EAD</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            <SelectItem value="Normal">Normal</SelectItem>
            <SelectItem value="Reposição">Reposição</SelectItem>
            <SelectItem value="Transferência">Transferência</SelectItem>
            <SelectItem value="EAD">EAD</SelectItem>
            <SelectItem value="Reserva">Reserva</SelectItem>
            <SelectItem value="Colaborador">Colaborador</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Inativo">Inativo</SelectItem>
            <SelectItem value="Trancado">Trancado</SelectItem>
            <SelectItem value="Cancelado">Cancelado</SelectItem>
            <SelectItem value="Finalizado">Finalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead><TableHead>Nascimento</TableHead><TableHead>Telefone</TableHead><TableHead>Tel. Responsável</TableHead><TableHead>Turma</TableHead><TableHead>Curso</TableHead><TableHead>Módulos</TableHead><TableHead>Modalidade</TableHead><TableHead>Tipo</TableHead><TableHead>Entrega</TableHead><TableHead>Status</TableHead>
              {(canEdit || isProfessor) && <TableHead className="w-28">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isLoading || !turmasLoaded) ? <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow> :
            alunosFiltrados.length === 0 ? <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">Nenhum aluno encontrado</TableCell></TableRow> :
            alunosFiltrados.map((a: any) => {
              const matricula = matriculaByAlunoId[a.id];
              const cursoNome = matricula ? cursosById[matricula.curso_id]?.nome || "-" : "-";
              const modulosProgress = matricula ? progressoByMatriculaId[matricula.id] || [] : [];
              const modulosLabel = modulosProgress
                .map((p: any) => modulosById[p.modulo_id]?.nome)
                .filter(Boolean)
                .slice(0, 2)
                .join(", ") || "-";
              const entrega = a.data_entrega_resultados
                ? new Date(a.data_entrega_resultados).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                : "-";

              const canEditRow = canEdit || (isProfessor && turmaIds.includes(a.turma_id));

              return (
                <TableRow key={a.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{a.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{a.data_nascimento ? new Date(a.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR") : "-"}</TableCell>
                  <TableCell className="text-xs">{a.telefone || "-"}</TableCell>
                  <TableCell className="text-xs">{a.telefone_responsavel || "-"}</TableCell>
                  <TableCell>{getTurmaNome(a.turma_id)}</TableCell>
                  <TableCell>{cursoNome}</TableCell>
                  <TableCell className="text-xs">{modulosLabel}</TableCell>
                  <TableCell><Badge variant={a.modalidade === 'EAD' ? 'secondary' : 'outline'}>{a.modalidade || 'Presencial'}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{a.tipo_aluno || 'Normal'}</Badge></TableCell>
                  <TableCell className="text-xs">{entrega}</TableCell>
                  <TableCell><Badge variant={a.status === 'Ativo' ? 'default' : a.status === 'Inativo' ? 'secondary' : 'destructive'}>{a.status}</Badge></TableCell>
                  {canEditRow ? (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" title="Editar" onClick={() => { setEditData(a); setModalOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Editar Datas" onClick={() => setDatasModal(a)}>
                          <Calendar className="h-3.5 w-3.5" />
                        </Button>
                        {canEdit && (
                          <>
                            <Button size="sm" variant="ghost" title="Transferir de turma" onClick={(e) => { e.stopPropagation(); setTransferModal(a); setNewTurmaId(""); }}>
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" title="Excluir" onClick={(e) => handleDelete(e, a)} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      {(canEdit || isProfessor) && <AlunoModal open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) setEditData(null); }} editData={editData} />}
      {canEdit && <ImportExcel open={importOpen} onOpenChange={setImportOpen} targetTable="alunos" />}

      <Dialog open={!!transferModal} onOpenChange={(o) => !o && setTransferModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transferir Aluno de Turma</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">Aluno: <strong>{transferModal?.nome}</strong></p>
            <p className="text-sm text-muted-foreground">Turma atual: {transferModal ? getTurmaNome(transferModal.turma_id) : ""}</p>
            <div>
              <label className="text-sm font-medium mb-1 block">Nova Turma</label>
              <Select value={newTurmaId} onValueChange={setNewTurmaId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {turmas.filter((t: any) => t.id !== transferModal?.turma_id).map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome} - {t.turno}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleTransfer} disabled={!newTurmaId} className="w-full">Confirmar Transferência</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!datasModal} onOpenChange={(o) => !o && setDatasModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Datas - {datasModal?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const matricula = matriculaByAlunoId[datasModal?.id];
              if (!matricula) {
                return <p className="text-muted-foreground">Este aluno não possui matrícula ativa.</p>;
              }

              const modulosProgress = progressoByMatriculaId[matricula.id] || [];

              return (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Data de Início do Curso</h3>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        defaultValue={matricula.data_inicio}
                        onChange={(e) => {
                          // Aqui seria implementada a atualização da data de início
                          console.log('Nova data início:', e.target.value);
                        }}
                      />
                      <Button size="sm" variant="outline">Salvar</Button>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Datas dos Módulos</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {modulosProgress.map((prog: any) => {
                        const modulo = modulosById[prog.modulo_id];
                        return (
                          <div key={prog.id} className="flex items-center gap-2 p-2 border rounded">
                            <span className="flex-1 text-sm">{modulo?.nome || 'Módulo'}</span>
                            <Input
                              type="date"
                              size="sm"
                              className="w-32"
                              defaultValue={prog.data_inicio}
                              onChange={(e) => {
                                // Aqui seria implementada a atualização da data de início do módulo
                                console.log(`Nova data início módulo ${prog.id}:`, e.target.value);
                              }}
                            />
                            <Input
                              type="date"
                              size="sm"
                              className="w-32"
                              defaultValue={prog.data_previsao_termino}
                              onChange={(e) => {
                                // Aqui seria implementada a atualização da data de término do módulo
                                console.log(`Nova data fim módulo ${prog.id}:`, e.target.value);
                              }}
                            />
                            <Button size="sm" variant="outline">Salvar</Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
