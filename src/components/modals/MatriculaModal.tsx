import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInsert, useTable } from "@/hooks/useSupabaseQuery";

const schema = z.object({
  aluno_id: z.string().min(1, "Selecione um aluno"),
  curso_id: z.string().min(1, "Selecione um curso"),
  turma_id: z.string().min(1, "Selecione uma turma"),
  data_inicio: z.string().min(1, "Data obrigatória"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatriculaModal({ open, onOpenChange }: Props) {
  const insert = useInsert("matriculas");
  const { data: alunos } = useTable("alunos");
  const { data: cursos } = useTable("cursos");
  const { data: turmas } = useTable("turmas");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { aluno_id: "", curso_id: "", turma_id: "", data_inicio: new Date().toISOString().split("T")[0] },
  });

  const onSubmit = async (values: FormValues) => {
    await insert.mutateAsync(values);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Matrícula</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="aluno_id" render={({ field }) => (
              <FormItem><FormLabel>Aluno</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{alunos?.map((a: any) => (<SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="curso_id" render={({ field }) => (
              <FormItem><FormLabel>Curso</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{cursos?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="turma_id" render={({ field }) => (
              <FormItem><FormLabel>Turma</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{turmas?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="data_inicio" render={({ field }) => (
              <FormItem><FormLabel>Data de Início</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <p className="text-xs text-muted-foreground">Os módulos do curso serão gerados automaticamente ao criar a matrícula.</p>
            <Button type="submit" className="w-full" disabled={insert.isPending}>
              {insert.isPending ? "Criando..." : "Criar Matrícula"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
