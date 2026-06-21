'use client'

import { useState, useEffect } from 'react'
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'

export function ManagerEffectivenessChart() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get('/hr-analytics/reports/manager-effectiveness')
        setData(res.data)
      } catch (error) {
        console.error('Failed to fetch manager effectiveness report', error)
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [])

  if (loading) {
    return <div className="h-[400px] w-full flex items-center justify-center text-muted-foreground animate-pulse border rounded-md">Carregando relatório...</div>
  }

  if (!data || !data.aggregateData) {
    return <div className="h-[400px] w-full flex items-center justify-center text-muted-foreground border rounded-md">Nenhum dado disponível.</div>
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Eficácia da Gestão (Drill-down)</CardTitle>
        <CardDescription>
          Escopo: {data.scope.name} | Período: {data.period.from} a {data.period.to}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.aggregateData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="managerName" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar 
                dataKey="metrics.turnoverRate" 
                name="Taxa de Turnover (%)" 
                fill="currentColor" 
                radius={[4, 4, 0, 0]} 
                className="fill-primary"
                onClick={(entry: any) => alert(`Drill-down para ${entry.managerName}: Requisição futura para ${entry.drillDownUrl}`)}
              />
              <Bar 
                dataKey="metrics.absenceRate" 
                name="Taxa de Absenteísmo (%)" 
                fill="currentColor" 
                radius={[4, 4, 0, 0]} 
                className="fill-destructive"
                onClick={(entry: any) => alert(`Drill-down para ${entry.managerName}: Requisição futura para ${entry.drillDownUrl}`)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-muted-foreground text-center mt-4">
          * Clique na barra de um gestor para visualizar os dados detalhados (Drill-down).
        </p>
      </CardContent>
    </Card>
  )
}
