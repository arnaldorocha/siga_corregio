import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInsert, useUpdate, useTable, useDelete } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";

const schema = z.object({
  nome: z.string().min(1, "Nome obrigatório").max(200),
  email: z.string().email("Email inválido").max(255).or(z.literal("")),
  telefone: z.string().max(20).optional(),
  telefone_responsavel: z.string().max(20).optional(),
  data_nascimento: z.string().optional(),
  status: z.enum(["Ativo", "Inativo", "Trancado", "Cancelado", "Finalizado"]),
  turma_id: z.string().optional(),
  curso_id: z.string().optional(),
  modulos: z.array(z.string()).optional(),
  modalidade: z.string().optional(),
  tipo_aluno: z.string().optional(),
  status_rematricula: z.string().optional(),
  interesse_rematricula: z.string().optional(),
  observacao_rematricula: z.string().optional(),
  curso_indicado: z.string().optional(),
  data_entrega_resultados: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.modulos && data.modulos.length > 0 && !data.curso_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Selecione um curso antes de escolher módulos.",
      path: ["curso_id"],
    });
  }

  if (data.data_entrega_resultados) {
    const entregaDate = new Date(data.data_entrega_resultados);
    const now = new Date();
    if (Number.isNaN(entregaDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data inválida.",
        path: ["data_entrega_resultados"],
      });
    } else if (entregaDate < now) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A data/hora deve ser no futuro.",
        path: ["data_entrega_resultados"],
      });
    }
  }
});

type FormValues = z.infer<typeof schema>;

const defaults: FormValues = {
  nome: "", email: "", telefone: "", telefone_responsavel: "", data_nascimento: "", status: "Ativo", turma_id: "", curso_id: "", modulos: [], modalidade: "Presencial", tipo_aluno: "Normal", status_rematricula: "Pendente", interesse_rematricula: "", observacao_rematricula: "", curso_indicado: "", data_entrega_resultados: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any;
}

export function AlunoModal({ open, onOpenChange, editData }: Props) {
  const insert = useInsert("alunos");
  const update = useUpdate("alunos");
  const deleteAluno = useDelete("alunos");
  const { data: turmas } = useTable("turmas");
  const { data: cursos } = useTable("cursos");
  const { data: modulos } = useTable("modulos");
  const { data: matriculas } = useTable("matriculas");
  const { data: progressoModulos } = useTable("progresso_modulos");
  const [hasEntregaColumn, setHasEntregaColumn] = useState<boolean | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const selectedCursoId = useWatch({ control: form.control, name: "curso_id" });
  const selectedModuleIds = useWatch({ control: form.control, name: "modulos" }) || [];
  const cursoModulos = useMemo(() => {
    if (!selectedCursoId || !modulos) return [];
    return (modulos as any[]).filter((m: any) => m.curso_id === selectedCursoId);
  }, [modulos, selectedCursoId]);

  const initialCourseRef = useRef<string | null>(null);
  // Reset selected modules only when the course changes after initial load
  useEffect(() => {
    if (initialCourseRef.current === null) {
      initialCourseRef.current = selectedCursoId;
      return;
    }
    if (selectedCursoId !== initialCourseRef.current) {
      form.setValue("modulos", []);
      initialCourseRef.current = selectedCursoId;
    }
  }, [selectedCursoId, form]);

  // Check if the entrega result column exists in the current schema
  useEffect(() => {
    supabase
      .from("alunos")
      .select("data_entrega_resultados")
      .limit(1)
      .then(({ error }) => {
        setHasEntregaColumn(!error);
      });
  }, []);

  // Reset form with editData when opening
  useEffect(() => {
    if (!open) return;

    const matricula = matriculas?.find((m: any) => m.aluno_id === editData?.id && m.status === "Ativa");
    const selectedCursoId = matricula?.curso_id || "";
    const selectedModulos = (progressoModulos || [])
      .filter((p: any) => p.matricula_id === matricula?.id)
      .map((p: any) => p.modulo_id);

    if (editData) {
      form.reset({
        nome: editData.nome || "",
        email: editData.email || "",
        telefone: editData.telefone || "",
        telefone_responsavel: editData.telefone_responsavel || "",
        data_nascimento: editData.data_nascimento || "",
        status: editData.status || "Ativo",
        turma_id: editData.turma_id || "",
        curso_id: selectedCursoId,
        modulos: selectedModulos,
        modalidade: editData.modalidade || "Presencial",
        tipo_aluno: editData.tipo_aluno || "Normal",
        status_rematricula: editData.status_rematricula || "Pendente",
        interesse_rematricula: editData.interesse_rematricula || "",
        observacao_rematricula: editData.observacao_rematricula || "",
        curso_indicado: editData.curso_indicado || "",
        data_entrega_resultados: editData.data_entrega_resultados || "",
      });
    } else {
      form.reset(defaults);
    }
  }, [open, editData, matriculas, progressoModulos]);

  const syncMatriculaAndModules = async (alunoId: string, values: FormValues) => {
    const cursoId = values.curso_id;
    if (!cursoId) return;

    const { data: existingMatricula } = await supabase
      .from("matriculas")
      .select("*")
      .eq("aluno_id", alunoId)
      .eq("status", "Ativa")
      .maybeSingle();

    const turmaId = values.turma_id || null;

    let matriculaId: string | undefined;
    if (existingMatricula) {
      matriculaId = existingMatricula.id;
      await supabase
        .from("matriculas")
        .update({ curso_id: cursoId, turma_id: turmaId })
        .eq("id", matriculaId);
    } else {
      const { data: inserted } = await supabase
        .from("matriculas")
        .insert({
          aluno_id: alunoId,
          curso_id: cursoId,
          turma_id: turmaId,
          status: "Ativa",
          data_inicio: new Date().toISOString().split("T")[0],
        })
        .select("id")
        .single();
      matriculaId = inserted?.id;
    }

    if (!matriculaId) return;

    // Rebuild module progress for the chosen course
    await supabase.from("progresso_modulos").delete().eq("matricula_id", matriculaId);

    const selectedModuleIds = values.modulos && values.modulos.length > 0
      ? values.modulos
      : (modulos || []).filter((m: any) => m.curso_id === cursoId).map((m: any) => m.id);

    let dataAcumulada = new Date();
    for (const moduloId of selectedModuleIds) {
      const modulo = (modulos || []).find((m: any) => m.id === moduloId);
      if (!modulo) continue;
      const diasModulo = Math.ceil((modulo.carga_horaria || 0) / 4);
      const dataInicio = new Date(dataAcumulada);
      const dataPrevisao = new Date(dataAcumulada);
      dataPrevisao.setDate(dataPrevisao.getDate() + diasModulo);

      await supabase.from("progresso_modulos").insert({
        matricula_id: matriculaId,
        modulo_id: moduloId,
        data_inicio: dataInicio.toISOString().split("T")[0],
        data_previsao_termino: dataPrevisao.toISOString().split("T")[0],
        status: "Em andamento",
      });

      dataAcumulada.setDate(dataAcumulada.getDate() + diasModulo + 1);
    }
  };

  const onSubmit = async (values: FormValues) => {
    const { curso_id, modulos, ...rest } = values;
    const payload = {
      ...rest,
      turma_id: values.turma_id || null,
      email: values.email || null,
      telefone: values.telefone || null,
      telefone_responsavel: values.telefone_responsavel || null,
      data_nascimento: values.data_nascimento || null,
      modalidade: values.modalidade || "Presencial",
      tipo_aluno: values.tipo_aluno || "Normal",
      status_rematricula: values.status_rematricula || "Pendente",
      interesse_rematricula: values.interesse_rematricula || null,
      observacao_rematricula: values.observacao_rematricula || null,
      curso_indicado: values.curso_indicado || null,
      ...(hasEntregaColumn ? { data_entrega_resultados: values.data_entrega_resultados ? new Date(values.data_entrega_resultados).toISOString() : null } : {}),
    };
    let alunoId: string | undefined;
    if (editData?.id) {
      alunoId = editData.id;
      await update.mutateAsync({ id: alunoId, ...payload });
    } else {
      const { data } = await insert.mutateAsync(payload);
      alunoId = (data as any)?.id;
    }

    if (alunoId) {
      await syncMatriculaAndModules(alunoId, values);
    }

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (editData?.id && confirm(`Excluir aluno "${editData.nome}"?`)) {
      deleteAluno.mutate(editData.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{editData ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
            {editData && (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
            )}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="data_nascimento" render={({ field }) => (
                <FormItem><FormLabel>Data de Nascimento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="telefone" render={({ field }) => (
                <FormItem><FormLabel>Telefone do Aluno</FormLabel><FormControl><Input {...field} placeholder="(00) 00000-0000" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="telefone_responsavel" render={({ field }) => (
                <FormItem><FormLabel>Telefone Responsável</FormLabel><FormControl><Input {...field} placeholder="(00) 00000-0000" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem><SelectItem value="Trancado">Trancado</SelectItem><SelectItem value="Cancelado">Cancelado</SelectItem><SelectItem value="Finalizado">Finalizado</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="turma_id" render={({ field }) => (
                <FormItem><FormLabel>Turma</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{turmas?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="modalidade" render={({ field }) => (
                <FormItem><FormLabel>Modalidade</FormLabel><Select onValueChange={field.onChange} value={field.value || "Presencial"}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Presencial">Presencial</SelectItem><SelectItem value="EAD">EAD</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tipo_aluno" render={({ field }) => (
                <FormItem><FormLabel>Tipo de Aluno</FormLabel><Select onValueChange={field.onChange} value={field.value || "Normal"}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Reposição">Reposição</SelectItem><SelectItem value="Transferência">Transferência</SelectItem><SelectItem value="EAD">EAD</SelectItem><SelectItem value="Reserva">Reserva</SelectItem><SelectItem value="Colaborador">Colaborador</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
            </div>
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-semibold mb-3">Curso e Módulos</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="curso_id" render={({ field }) => (
                  <FormItem><FormLabel>Curso</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{cursos?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormItem>
                  <FormLabel>Módulos</FormLabel>
                  <div className="grid gap-2 max-h-44 overflow-y-auto p-2 rounded border border-muted-foreground/20 bg-muted/50">
                    {cursoModulos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Selecione um curso para ver os módulos.</p>
                    ) : cursoModulos.map((mod: any) => (
                      <label key={mod.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selectedModuleIds.includes(mod.id)}
                          onCheckedChange={(checked) => {
                            const current = selectedModuleIds || [];
                            if (checked) {
                              form.setValue("modulos", [...current, mod.id]);
                            } else {
                              form.setValue("modulos", current.filter((id: string) => id !== mod.id));
                            }
                          }}
                        />
                        <span className="flex-1">{mod.nome}</span>
                        <span className="text-xs text-muted-foreground">{mod.carga_horaria}h</span>
                      </label>
                    ))}
                  </div>
                </FormItem>
              </div>
            </div>
            {hasEntregaColumn !== false && (
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-semibold mb-3">Entrega de Resultados</p>
                <FormField control={form.control} name="data_entrega_resultados" render={({ field }) => (
                  <FormItem><FormLabel>Data e Hora da Entrega</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            )}

            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-semibold mb-3">Rematrícula</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="status_rematricula" render={({ field }) => (
                  <FormItem><FormLabel>Status Rematrícula</FormLabel><Select onValueChange={field.onChange} value={field.value || "Pendente"}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Confirmada">Confirmada</SelectItem><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Não respondeu">Não respondeu</SelectItem><SelectItem value="Não vai rematricular">Não vai rematricular</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="interesse_rematricula" render={({ field }) => (
                  <FormItem><FormLabel>Interesse</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Alto interesse">Alto interesse</SelectItem><SelectItem value="Médio interesse">Médio interesse</SelectItem><SelectItem value="Baixo interesse">Baixo interesse</SelectItem><SelectItem value="Não tem interesse">Não tem interesse</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="observacao_rematricula" render={({ field }) => (
                <FormItem className="mt-3"><FormLabel>Observação</FormLabel><FormControl><Input {...field} placeholder="Observações sobre rematrícula..." /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="curso_indicado" render={({ field }) => (
                <FormItem className="mt-3"><FormLabel>Curso Indicado</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Indicar curso..." /></SelectTrigger></FormControl><SelectContent>{cursos?.map((c: any) => (<SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
              )} />
            </div>
            <Button type="submit" className="w-full" disabled={insert.isPending || update.isPending}>
              {editData ? "Salvar" : "Criar"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
