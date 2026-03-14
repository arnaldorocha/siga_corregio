import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: alunos, error: alunosErr } = await supabase
      .from("alunos")
      .select("id, nome, status_rematricula, interesse_rematricula, turma_id")
      .eq("status", "Ativo");

    if (alunosErr) throw alunosErr;

    const { data: matriculas } = await supabase.from("matriculas").select("id, aluno_id, status").eq("status", "Ativa");
    const { data: frequencias } = await supabase.from("frequencias").select("id, matricula_id, presente");
    const { data: turmas } = await supabase.from("turmas").select("id, nome");

    let alertasCriados = 0;
    const hoje = new Date().toISOString().split("T")[0];

    for (const aluno of alunos || []) {
      let score = 0;
      const mat = (matriculas || []).find((m: any) => m.aluno_id === aluno.id);
      let faltas = 0;
      if (mat) {
        faltas = (frequencias || []).filter((f: any) => f.matricula_id === mat.id && !f.presente).length;
        if (faltas > 3) score += 2;
      }
      if (aluno.interesse_rematricula === "Baixo interesse" || aluno.interesse_rematricula === "Não tem interesse") score += 3;
      if (aluno.status_rematricula === "Não respondeu") score += 2;
      if (aluno.status_rematricula === "Pendente") score += 1;

      if (score >= 5) {
        const turmaNome = (turmas || []).find((t: any) => t.id === aluno.turma_id)?.nome || "Sem turma";

        const { data: existing } = await supabase
          .from("notificacoes")
          .select("id")
          .eq("data", hoje)
          .ilike("mensagem", `%${aluno.nome}%risco%`)
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from("notificacoes").insert({
            tipo: "danger",
            titulo: "⚠️ Aluno em risco de evasão",
            mensagem: `${aluno.nome} (${turmaNome}) — risco ${score}pts: ${faltas > 3 ? `${faltas} faltas, ` : ""}${aluno.interesse_rematricula || "sem interesse definido"}, status: ${aluno.status_rematricula || "Pendente"}`,
          });
          alertasCriados++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, alunos_verificados: (alunos || []).length, alertas_criados: alertasCriados }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
