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

    const agora = new Date();
    const amanha = new Date(agora);
    amanha.setDate(amanha.getDate() + 1);
    const umaHoraDepois = new Date(agora);
    umaHoraDepois.setHours(umaHoraDepois.getHours() + 1);

    // Fetch students with entrega_resultados scheduled
    const { data: alunos, error } = await supabase
      .from("alunos")
      .select("id, nome, data_entrega_resultados")
      .not("data_entrega_resultados", "is", null);

    if (error) throw error;

    let notificacoesCriadas = 0;

    for (const aluno of alunos || []) {
      const dataEntrega = new Date(aluno.data_entrega_resultados);

      // Check if tomorrow
      const isAmanha = dataEntrega.toDateString() === amanha.toDateString();
      // Check if within 1 hour
      const isUmaHora = dataEntrega > agora && dataEntrega <= umaHoraDepois;

      if (isAmanha) {
        await supabase.from("notificacoes").insert({
          tipo: "info",
          titulo: "📅 Entrega de Resultados Amanhã",
          mensagem: `Entrega de resultados agendada para amanhã com ${aluno.nome} às ${dataEntrega.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        });
        notificacoesCriadas++;
      } else if (isUmaHora) {
        await supabase.from("notificacoes").insert({
          tipo: "warning",
          titulo: "⏰ Entrega de Resultados em 1 Hora",
          mensagem: `Entrega de resultados em 1 hora com ${aluno.nome} às ${dataEntrega.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        });
        notificacoesCriadas++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, notificacoesCriadas }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});