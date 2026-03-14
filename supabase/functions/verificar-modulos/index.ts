import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const hoje = new Date();
    const hojeStr = hoje.toISOString().split("T")[0];

    // Buscar todos os módulos em andamento
    const { data: progressos, error: errProg } = await supabase
      .from("progresso_modulos")
      .select("id, matricula_id, modulo_id, data_previsao_termino, status")
      .eq("status", "Em andamento");

    if (errProg) throw errProg;

    // Buscar nomes dos módulos e matrículas/alunos
    const { data: modulos } = await supabase.from("modulos").select("id, nome");
    const { data: matriculas } = await supabase.from("matriculas").select("id, aluno_id");
    const { data: alunos } = await supabase.from("alunos").select("id, nome");

    const moduloMap = Object.fromEntries((modulos || []).map((m: any) => [m.id, m.nome]));
    const matriculaMap = Object.fromEntries((matriculas || []).map((m: any) => [m.id, m.aluno_id]));
    const alunoMap = Object.fromEntries((alunos || []).map((a: any) => [a.id, a.nome]));

    let alertasCriados = 0;
    let modulosAtrasados = 0;

    for (const p of progressos || []) {
      const previsao = new Date(p.data_previsao_termino);
      const diffMs = previsao.getTime() - hoje.getTime();
      const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const nomeModulo = moduloMap[p.modulo_id] || "Módulo";
      const alunoId = matriculaMap[p.matricula_id];
      const nomeAluno = alunoMap[alunoId] || "Aluno";

      // Módulo atrasado
      if (diffDias < 0) {
        await supabase
          .from("progresso_modulos")
          .update({ status: "Atrasado" })
          .eq("id", p.id);
        modulosAtrasados++;

        await supabase.from("notificacoes").insert({
          tipo: "danger",
          titulo: `Módulo atrasado`,
          mensagem: `${nomeAluno} - "${nomeModulo}" venceu em ${p.data_previsao_termino}`,
        });
        alertasCriados++;
        continue;
      }

      // Alerta 7 dias
      if (diffDias <= 7 && diffDias > 0) {
        await supabase.from("notificacoes").insert({
          tipo: "warning",
          titulo: `Vence em ${diffDias} dia(s) - 7 dias`,
          mensagem: `${nomeAluno} - "${nomeModulo}" vence em ${p.data_previsao_termino}`,
        });
        alertasCriados++;
      }

      // Alerta 14 dias
      if (diffDias <= 14 && diffDias > 7) {
        await supabase.from("notificacoes").insert({
          tipo: "info",
          titulo: `Vence em ${diffDias} dia(s) - 14 dias`,
          mensagem: `${nomeAluno} - "${nomeModulo}" vence em ${p.data_previsao_termino}`,
        });
        alertasCriados++;
      }

      // Alerta 30 dias (1 mês)
      if (diffDias <= 30 && diffDias > 14) {
        await supabase.from("notificacoes").insert({
          tipo: "info",
          titulo: `Vence em ${diffDias} dia(s) - 30 dias`,
          mensagem: `${nomeAluno} - "${nomeModulo}" vence em ${p.data_previsao_termino}`,
        });
        alertasCriados++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: hojeStr,
        progressos_verificados: (progressos || []).length,
        alertas_criados: alertasCriados,
        modulos_atrasados: modulosAtrasados,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
