import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Trash2, Search, Users, Pencil } from "lucide-react";
import { ImportVagas } from "@/components/ImportVagas";
import { useTable, useDelete } from "@/hooks/useSupabaseQuery";
import { TurmaModal } from "@/components/modals/TurmaModal";
import { TurmaAlunosModal } from "@/components/modals/TurmaAlunosModal";
import { useUserRole, useProfessorTurmas } from "@/hooks/useUserRole";

export default function Turmas() {
  const { data: turmas = [], isLoading } = useTable("turmas");
  const { data: matriculas = [] } = useTable("matriculas");
  const { data: alunos = [] } = useTable("alunos");
  const { data: professorTurmas = [] } = useTable("professor_turmas");
  const { data: profiles = [] } = useTable("profiles");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [importVagasOpen, setImportVagasOpen] = useState(false);
  const [alunosModalTurma, setAlunosModalTurma] = useState<any>(null);
  const { canEdit, isAdmin } = useUserRole();
  const { filterByTurma, loaded: turmasLoaded } = useProfessorTurmas();
  const deleteTurma = useDelete("turmas");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDia, setFilterDia] = useState("all");
  const [filterTurno, setFilterTurno] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProfessor, setFilterProfessor] = useState("all");

  const getProfessorNome = (turmaId: string) => {
    const pt = professorTurmas.find((p: any) => p.turma_id === turmaId);
    if (!pt) return "—";
    const profile = profiles.find((p: any) => p.user_id === pt.user_id);
    return profile?.display_name || "—";
  };

  const getProfessorUserId = (turmaId: string) => {
    const pt = professorTurmas.find((p: any) => p.turma_id === turmaId);
    return pt?.user_id || null;
  };

  // Unique professors for filter
  const professoresUnicos = useMemo(() => {
    const map = new Map<string, string>();
    professorTurmas.forEach((pt: any) => {
      const profile = profiles.find((p: any) => p.user_id === pt.user_id);
      if (profile && !map.has(pt.user_id)) {
        map.set(pt.user_id, profile.display_name || pt.user_id);
      }
    });
    return Array.from(map.entries()); // [user_id, displayName]
  }, [professorTurmas, profiles]);

  const turmasComVagas = useMemo(() => {
    if (!turmasLoaded) return [];
    const filtered = filterByTurma(turmas, "id");
    return filtered
      .map((t: any) => {
        // Count by alunos.turma_id directly - exclude Trancado, EAD, and non-active statuses
        const ocupadas = alunos.filter((a: any) => {
          if (a.turma_id !== t.id) return false;
          if (a.status === 'Trancado' || a.status === 'Inativo' || a.status === 'Cancelado' || a.status === 'Finalizado') return false;
          if (a.modalidade === 'EAD') return false;
          return true;
        }).length;
        return { ...t, ocupadas, disponiveis: t.capacidade_maxima - ocupadas, professor: getProfessorNome(t.id), professorUserId: getProfessorUserId(t.id) };
      })
      .filter((t: any) => {
        if (searchTerm && !t.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (filterDia !== "all" && t.dia_semana !== filterDia) return false;
        if (filterTurno !== "all" && t.turno !== filterTurno) return false;
        if (filterStatus !== "all" && t.status !== filterStatus) return false;
        if (filterProfessor !== "all" && t.professorUserId !== filterProfessor) return false;
        return true;
      });
  }, [turmas, matriculas, searchTerm, filterDia, filterTurno, filterStatus, filterProfessor, professorTurmas, profiles, turmasLoaded, filterByTurma]);

  const handleDelete = (e: React.MouseEvent, turma: any) => {
    e.stopPropagation();
    if (confirm(`Excluir turma "${turma.nome}"?`)) {
      deleteTurma.mutate(turma.id);
    }
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Turmas</h1>
          <p className="page-description">Gerenciamento de turmas e vagas</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportVagasOpen(true)}><Upload className="h-4 w-4 mr-2" />Importar Vagas</Button>
            <Button onClick={() => { setEditData(null); setModalOpen(true); }}><Plus className="h-4 w-4 mr-2" />Nova Turma</Button>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar turma..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterDia} onValueChange={setFilterDia}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Dia da Semana" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os dias</SelectItem>
            <SelectItem value="Segunda-feira">Segunda</SelectItem>
            <SelectItem value="Terça-feira">Terça</SelectItem>
            <SelectItem value="Quarta-feira">Quarta</SelectItem>
            <SelectItem value="Quinta-feira">Quinta</SelectItem>
            <SelectItem value="Sexta-feira">Sexta</SelectItem>
            <SelectItem value="Sábado">Sábado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTurno} onValueChange={setFilterTurno}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Turno" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos turnos</SelectItem>
            <SelectItem value="Manhã">Manhã</SelectItem>
            <SelectItem value="Tarde">Tarde</SelectItem>
            <SelectItem value="Noite">Noite</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="Ativa">Ativa</SelectItem>
            <SelectItem value="Inativa">Inativa</SelectItem>
            <SelectItem value="Encerrada">Encerrada</SelectItem>
          </SelectContent>
        </Select>
        {(isAdmin || canEdit) && professoresUnicos.length > 0 && (
          <Select value={filterProfessor} onValueChange={setFilterProfessor}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Professor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos professores</SelectItem>
              {professoresUnicos.map(([userId, name]) => (
                <SelectItem key={userId} value={userId}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead><TableHead>Professor</TableHead><TableHead>Dia da Semana</TableHead><TableHead>Horário</TableHead><TableHead>Turno</TableHead><TableHead>Status</TableHead><TableHead>Capacidade</TableHead><TableHead>Ocupadas</TableHead><TableHead>Disponíveis</TableHead>
              <TableHead className="w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isLoading || !turmasLoaded) ? <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow> :
            turmasComVagas.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Nenhuma turma encontrada</TableCell></TableRow> :
            turmasComVagas.map((t: any) => (
              <TableRow key={t.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{t.nome}</TableCell>
                <TableCell className="text-muted-foreground">{t.professor}</TableCell>
                <TableCell>{t.dia_semana || "—"}</TableCell>
                <TableCell>{t.horario || "—"}</TableCell>
                <TableCell>{t.turno}</TableCell>
                <TableCell><Badge variant={t.status === 'Ativa' ? 'default' : 'secondary'}>{t.status}</Badge></TableCell>
                <TableCell>{t.capacidade_maxima}</TableCell>
                <TableCell>{t.ocupadas}</TableCell>
                <TableCell><Badge variant={t.disponiveis > 5 ? 'default' : t.disponiveis > 0 ? 'secondary' : 'destructive'}>{t.disponiveis}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" title="Ver alunos" onClick={() => setAlunosModalTurma(t)}>
                      <Users className="h-3.5 w-3.5" />
                    </Button>
                    {canEdit && (
                      <>
                        <Button size="sm" variant="ghost" title="Editar" onClick={() => { setEditData(t); setModalOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Excluir" onClick={(e) => handleDelete(e, t)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {canEdit && <TurmaModal open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) setEditData(null); }} editData={editData} />}
      {canEdit && <ImportVagas open={importVagasOpen} onOpenChange={setImportVagasOpen} />}
      <TurmaAlunosModal open={!!alunosModalTurma} onOpenChange={(o) => !o && setAlunosModalTurma(null)} turma={alunosModalTurma} />
    </div>
  );
}
