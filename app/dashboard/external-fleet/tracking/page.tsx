'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Truck, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/components/map/live-map'), { 
  ssr: false, 
  loading: () => <div className="h-full w-full flex items-center justify-center bg-muted/20">Carregando Mapa...</div> 
});

export default function FleetTrackingPage() {
  const [activeFreights, setActiveFreights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFreights = async () => {
      try {
        const res = await api.get('/external-fleet/freights');
        setActiveFreights(res.data.filter((f: any) => f.status === 'EM_ANDAMENTO'));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFreights();
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 w-full max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rastreamento em Tempo Real</h1>
        <p className="text-muted-foreground">Acompanhe as viagens em andamento da sua frota.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
        {/* Lado Esquerdo: Lista de Viagens */}
        <Card className="flex flex-col h-full overflow-hidden col-span-1 border-r shadow-md">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="w-5 h-5" /> Em Andamento
              <Badge variant="secondary" className="ml-2">{activeFreights.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-auto">
            {loading ? (
               <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : activeFreights.length === 0 ? (
               <div className="p-8 text-center text-muted-foreground border-t border-dashed m-4 rounded-lg">Nenhum frete em andamento.</div>
            ) : (
              <div className="divide-y">
                {activeFreights.map(freight => (
                  <div key={freight.id} className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                     <div className="font-medium text-sm flex items-center justify-between mb-2">
                       <span>Motorista: {freight.motorista?.nome || '???'}</span>
                       <Badge variant="default" className="bg-green-600">Ativo</Badge>
                     </div>
                     <div className="text-xs text-muted-foreground space-y-1">
                       <div className="flex items-center gap-1">
                         <Truck className="w-3 h-3"/> {freight.veiculo?.placa || '???'} - {freight.veiculo?.tipo}
                       </div>
                       <div className="flex items-center gap-1">
                         <MapPin className="w-3 h-3"/> Destino: {freight.cidade?.nome}
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lado Direito: Mapa Visual Real */}
        <Card className="lg:col-span-2 relative bg-zinc-100 overflow-hidden shadow-md">
          <LiveMap freights={activeFreights} />
        </Card>
      </div>
    </div>
  )
}
