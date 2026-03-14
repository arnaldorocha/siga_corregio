import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, UserCog, Shield } from "lucide-react";
import { useTable } from "@/hooks/useSupabaseQuery";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Usuarios() {
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: turmas = [] } = useTable("turmas");
  const { data: professorTurmas = [] } = useTable("professor_turmas");
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ email: "", password: "", display_name: "", role: "professor" });
  const [turmaModal, setTurmaModal] = useState<any>(null);
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    const { data: r } = await supabase.from("user_roles").select("*");
    setRoles(r || []);
    const { data: p } = await supabase.from("profiles").select("*");
    setProfiles(p || []);
    // Build user list from roles + profiles
    const userMap = new Map<string, any>();
    (r || []).forEach((role: any) => {
      if (!userMap.has(role.user_id)) userMap.set(role.user_id, { user_id: role.user_id, roles: [] });
      userMap.get(role.user_id).roles.push(role.role);
    });
    (p || []).forEach((prof: any) => {
      if (userMap.has(prof.user_id)) {
        userMap.get(prof.user_id).display_name = prof.display_name;
      }
    });
    setUsers(Array.from(userMap.values()));
  };

  useEffect(() => { loadUsers(); }, []);

  const getUserTurmas = (userId: string) => {
    return professorTurmas.filter((pt: any) => pt.user_id === userId);
  };

  const getTurmaNome = (turmaId: string) => turmas.find((t: any) => t.id === turmaId)?.nome || "-";

  const handleCreate = async () => {
    setSaving(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await supabase.functions.invoke("create-user", {
        body: { email: form.email, password: form.password, role: form.role, display_name: form.display_name },
      });
      if (res.error) throw res.error;
      toast({ title: "Usuário criado com sucesso!" });
      setModalOpen(false);
      setForm({ email: "", password: "", display_name: "", role: "professor" });
      await loadUsers();
      queryClient.invalidateQueries({ queryKey: ["user_roles"] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || JSON.stringify(e), variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Tem certeza que deseja remover este usuário?")) return;
    try {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      await supabase.from("professor_turmas").delete().eq("user_id", userId);
      toast({ title: "Usuário removido" });
      await loadUsers();
      queryClient.invalidateQueries({ queryKey: ["professor_turmas"] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const openTurmaModal = (user: any) => {
    setTurmaModal(user);
    const current = professorTurmas.filter((pt: any) => pt.user_id === user.user_id).map((pt: any) => pt.turma_id);
    setSelectedTurmas(current);
  };

  const saveTurmas = async () => {
    setSaving(true);
    try {
      const userId = turmaModal.user_id;
      // Remove all existing
      await supabase.from("professor_turmas").delete().eq("user_id", userId);
      // Insert new
      if (selectedTurmas.length > 0) {
        await supabase.from("professor_turmas").insert(
          selectedTurmas.map((turmaId) => ({ user_id: userId, turma_id: turmaId }))
        );
      }
      queryClient.invalidateQueries({ queryKey: ["professor_turmas"] });
      toast({ title: "Turmas atualizadas!" });
      setTurmaModal(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (!isAdmin) {
    return (
      <div>
        <div className="page-header"><h1 className="page-title">Acesso Negado</h1></div>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  const roleLabel: Record<string, string> = {
    admin: "Administrador",
    coordenacao: "Coordenação",
    professor: "Professor",
    financeiro: "Financeiro",
  };

  const roleVariant = (role: string) => {
    if (role === "admin") return "destructive" as const;
    if (role === "coordenacao") return "default" as const;
    return "secondary" as const;
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Gestão de Usuários</h1>
          <p className="page-description">Gerenciar professores, coordenação e permissões</p>
        </div>
        <Button onClick={() => { setEditUser(null); setForm({ email: "", password: "", display_name: "", role: "professor" }); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Novo Usuário
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Turmas Vinculadas</TableHead>
              <TableHead className="w-40">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum usuário cadastrado.</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.user_id}>
                <TableCell className="font-medium">{u.display_name || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {u.roles.map((r: string) => (
                      <Badge key={r} variant={roleVariant(r)}>{roleLabel[r] || r}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {getUserTurmas(u.user_id).length === 0 ? (
                      <span className="text-xs text-muted-foreground">Nenhuma</span>
                    ) : getUserTurmas(u.user_id).map((pt: any) => (
                      <Badge key={pt.id} variant="outline" className="text-xs">{getTurmaNome(pt.turma_id)}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openTurmaModal(u)} title="Vincular turmas">
                      <UserCog className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => handleDelete(u.user_id)} title="Remover">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create user modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Nome completo" /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" /></div>
            <div><Label>Senha</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" /></div>
            <div>
              <Label>Perfil</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professor">Professor</SelectItem>
                  <SelectItem value="coordenacao">Coordenação</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={saving || !form.email || !form.password} className="w-full">
              {saving ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Turma assignment modal */}
      <Dialog open={!!turmaModal} onOpenChange={(o) => !o && setTurmaModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vincular Turmas — {turmaModal?.display_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {turmas.map((t: any) => (
              <label key={t.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                <Checkbox
                  checked={selectedTurmas.includes(t.id)}
                  onCheckedChange={(checked) => {
                    setSelectedTurmas(checked
                      ? [...selectedTurmas, t.id]
                      : selectedTurmas.filter((id) => id !== t.id)
                    );
                  }}
                />
                <div>
                  <span className="text-sm font-medium">{t.nome}</span>
                  <span className="text-xs text-muted-foreground ml-2">{t.turno}</span>
                </div>
              </label>
            ))}
          </div>
          <Button onClick={saveTurmas} disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Salvar Vinculações"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
