'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

/**
 * SectorRadar — empresa vs promedio sectorial.
 *
 * Ejes = áreas del score de compliance. Una línea emerald = la empresa;
 * otra neutra = el promedio del sector (anonimizado).
 */

export interface RadarAxisDatum {
  area: string
  org: number
  sector: number
}

interface SectorRadarProps {
  data: RadarAxisDatum[]
  sectorLabel?: string
}

export function SectorRadar({ data, sectorLabel = 'Sector' }: SectorRadarProps) {
  return (
    <Card padding="none" className="motion-fade-in-up">
      <CardHeader>
        <div>
          <CardTitle>Benchmark sectorial</CardTitle>
          <CardDescription>
            Tu compliance por área vs promedio del sector (anonimizado).
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="rgba(148,163,184,0.18)" />
              <PolarAngleAxis
                dataKey="area"
                tick={{ fill: 'rgba(203,213,225,0.9)', fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: 'rgba(148,163,184,0.75)', fontSize: 9 }}
                stroke="rgba(148,163,184,0.14)"
              />
              <Radar
                name={sectorLabel}
                dataKey="sector"
                stroke="rgba(148,163,184,0.58)"
                fill="rgba(148,163,184,0.16)"
                fillOpacity={0.4}
                strokeWidth={1.5}
              />
              <Radar
                name="Tu empresa"
                dataKey="org"
                stroke="#22d3ee"
                fill="rgba(20,184,166,0.24)"
                fillOpacity={0.6}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.96)',
                  border: '1px solid rgba(148,163,184,0.18)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#f8fafc',
                  boxShadow: '0 18px 48px rgba(2,6,23,0.42)',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                formatter={(value) => (
                  <span style={{ color: 'rgba(203,213,225,0.9)', fontSize: 11 }}>{value}</span>
                )}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
