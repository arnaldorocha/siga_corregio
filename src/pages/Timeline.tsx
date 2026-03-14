import TimelineAluno from "@/components/TimelineAluno";

export default function Timeline() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Linha do Tempo</h1>
        <p className="page-description">Visualize o período de cada aluno no curso, do início ao fim de cada módulo</p>
      </div>
      <TimelineAluno />
    </div>
  );
}
