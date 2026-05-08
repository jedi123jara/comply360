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
              <PolarGrid stroke="rgba(15,23,42,0.08)" />
              <PolarAngleAxis
                dataKey="area"
                tick={{ fill: 'rgba(71,85,105,0.95)', fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: 'rgba(100,116,139,0.7)', fontSize: 9 }}
                stroke="rgba(15,23,42,0.06)"
              />
              <Radar
                name={sectorLabel}
                dataKey="sector"
                stroke="rgba(100,116,139,0.5)"
                fill="rgba(148,163,184,0.18)"
                fillOpacity={0.4}
                strokeWidth={1.5}
              />
              <Radar
                name="Tu empresa"
                dataKey="org"
                stroke="#1d4ed8"
                fill="rgba(16,185,129,0.18)"
                fillOpacity={0.6}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid rgba(15,23,42,0.12)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#0f172a',
                  boxShadow: '0 12px 32px rgba(15,23,42,0.08)',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                formatter={(value) => (
                  <span style={{ color: 'rgba(71,85,105,0.95)', fontSize: 11 }}>{value}</span>
                )}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
