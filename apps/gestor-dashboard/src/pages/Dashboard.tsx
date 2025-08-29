import RankingAssiduidadeCard from "../components/RankingAssiduidadeCard";
import HeatmapSemanaHoraCard from "../components/HeatmapSemanaHoraCard";
import OcupacaoSemanaCard from "../components/OcupacaoSemanaCard";
import OcupacaoPorDiaCard from "../components/OcupacaoPorDiaCard";

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-6">
      <OcupacaoSemanaCard />
      <OcupacaoPorDiaCard />
      <RankingAssiduidadeCard limit={10} />
      <HeatmapSemanaHoraCard />
    </div>
  );
}
