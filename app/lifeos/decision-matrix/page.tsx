import SectionHeader from "../section-header";
import DecisionMatrixWorkspace from "./decision-matrix-workspace";

export default function DecisionMatrixPage() {
  return <>
    <SectionHeader
      eyebrow="Daily focus"
      title="Eisenhower Decision Matrix"
      description="Sort open work by urgency and importance. A fresh matrix opens each day, while yesterday’s choices remain stored for future reflection."
    />
    <DecisionMatrixWorkspace />
  </>;
}
