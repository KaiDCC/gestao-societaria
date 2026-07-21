import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface CardsResumoProps {
  resumo: {
    no_prazo: number;
    a_vencer: number;
    vencidos: number;
  };
  onCardClick?: (status: string) => void; 
}

export function CardsResumo({ resumo, onCardClick }: CardsResumoProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card 
        className="border border-emerald-500 shadow-sm bg-white rounded-xl hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onCardClick && onCardClick('No Prazo')}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={24} /></div>
          <div>
            <p className="text-2xl font-black text-primary">{resumo?.no_prazo || 0}</p>
            <p className="text-xs font-bold text-primary/40 uppercase">No Prazo</p>
          </div>
        </CardContent>
      </Card>
      
      <Card 
        className="border border-yellow-500 shadow-sm bg-white rounded-xl hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onCardClick && onCardClick('A Vencer')}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><AlertCircle size={24} /></div>
          <div>
            <p className="text-2xl font-black text-primary">{resumo?.a_vencer || 0}</p>
            <p className="text-xs font-bold text-primary/40 uppercase">A Vencer</p>
          </div>
        </CardContent>
      </Card>
      
      <Card 
        className="border border-red-500 shadow-sm bg-white rounded-xl hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onCardClick && onCardClick('Vencido')}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg"><XCircle size={24} /></div>
          <div>
            <p className="text-2xl font-black text-primary">{resumo?.vencidos || 0}</p>
            <p className="text-xs font-bold text-primary/40 uppercase">Vencidos</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
