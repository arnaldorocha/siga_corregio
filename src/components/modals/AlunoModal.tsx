import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInsert, useUpdate, useTable, useDelete } from "@/hooks/useSupabaseQuery";
import { Trash2 } from "lucide-react";

const schema = z.object({
  nome: z.string().min(1, "Nome obrigatório").max(200),
  email: z.string().email("Email inválido").max(255).or(z.literal("")),
  telefone: z.string().max(20).optional(),
  telefone_responsavel: z.string().max(20).optional(),
  data_nascimento: z.string().optional(),
  status: z.enum(["Ativo", "Inativo", "Trancado"]),
  turma_id: z.string().optional(),
  modalidade: z.string().optional(),
  tipo_aluno: z.string().optional(),
  status_rematricula: z.string().optional(),
  interesse_rematricula: z.string().optional(),
  observacao_rematricula: z.string().optional(),
  curso_indicado: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const defaults: FormValues = {
  nome: "", email: "", telefone: "", telefone_responsavel: "", data_nascimento: "", status: "Ativo", turma_id: "", modalidade: "Presencial", tipo_aluno: "Normal", status_rematricula: "Pendente", interesse_rematricula: "", observacao_rematricula: "", curso_indicado: "",
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
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  // Reset form with editData when opening
  useEffect(() => {
    if (open) {
      if (editData) {
        form.reset({
          nome: editData.nome || "",
          email: editData.email || "",
          telefone: editData.telefone || "",
          telefone_responsavel: editData.telefone_responsavel || "",
          data_nascimento: editData.data_nascimento || "",
          status: editData.status || "Ativo",
          turma_id: editData.turma_id || "",
          modalidade: editData.modalidade || "Presencial",
          tipo_aluno: editData.tipo_aluno || "Normal",
          status_rematricula: editData.status_rematricula || "Pendente",
          interesse_rematricula: editData.interesse_rematricula || "",
          observacao_rematricula: editData.observacao_rematricula || "",
          curso_indicado: editData.curso_indicado || "",
        });
      } else {
        form.reset(defaults);
      }
    }
  }, [open, editData]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
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
    };
    if (editData?.id) {
      await update.mutateAsync({ id: editData.id, ...payload });
    } else {
      await insert.mutateAsync(payload);
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
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem><SelectItem value="Trancado">Trancado</SelectItem></SelectContent></Select><FormMessage /></FormItem>
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
