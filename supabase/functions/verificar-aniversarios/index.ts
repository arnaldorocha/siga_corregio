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
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const mesAmanha = amanha.getMonth() + 1;
    const diaAmanha = amanha.getDate();
    const mesHoje = hoje.getMonth() + 1;
    const diaHoje = hoje.getDate();

    // Fetch active students with birthdays
    const { data: alunos, error } = await supabase
      .from("alunos")
      .select("id, nome, data_nascimento")
      .eq("status", "Ativo")
      .not("data_nascimento", "is", null);

    if (error) throw error;

    let alertasCriados = 0;

    for (const aluno of alunos || []) {
      const nascimento = new Date(aluno.data_nascimento + "T12:00:00");
      const mesNasc = nascimento.getMonth() + 1;
      const diaNasc = nascimento.getDate();
      const idade = hoje.getFullYear() - nascimento.getFullYear();

      // Birthday is tomorrow
      if (mesNasc === mesAmanha && diaNasc === diaAmanha) {
        await supabase.from("notificacoes").insert({
          tipo: "info",
          titulo: "🎂 Aniversário amanhã!",
          mensagem: `${aluno.nome} faz ${idade} anos amanhã (${String(diaAmanha).padStart(2, "0")}/${String(mesAmanha).padStart(2, "0")})`,
        });
        alertasCriados++;
      }

      // Birthday is today
      if (mesNasc === mesHoje && diaNasc === diaHoje) {
        await supabase.from("notificacoes").insert({
          tipo: "warning",
          titulo: "🎉 Aniversário hoje!",
          mensagem: `${aluno.nome} está fazendo ${idade} anos hoje! Parabéns!`,
        });
        alertasCriados++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alunos_verificados: (alunos || []).length,
        alertas_criados: alertasCriados,
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
