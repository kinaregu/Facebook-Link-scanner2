"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

type ScanResult = {
  url: string
  score: number
  details: string
  timestamp: Date
}

type DashboardProps = {
  scanHistory: ScanResult[]
}

export function DashboardView({ scanHistory }: DashboardProps) {
  const [threatDistribution, setThreatDistribution] = useState<{ name: string; value: number }[]>([])
  const [scansByDay, setScansByDay] = useState<{ name: string; scans: number }[]>([])

  useEffect(() => {
    // Calculate threat distribution
    const lowThreats = scanHistory.filter((scan) => scan.score < 30).length
    const mediumThreats = scanHistory.filter((scan) => scan.score >= 30 && scan.score < 70).length
    const highThreats = scanHistory.filter((scan) => scan.score >= 70).length

    setThreatDistribution([
      { name: "Low Risk", value: lowThreats },
      { name: "Medium Risk", value: mediumThreats },
      { name: "High Risk", value: highThreats },
    ])

    // Calculate scans by day
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split("T")[0]
    }).reverse()

    const scanCounts = last7Days.map((day) => {
      const count = scanHistory.filter((scan) => {
        const scanDay = scan.timestamp.toISOString().split("T")[0]
        return scanDay === day
      }).length

      // Format date to be more readable (e.g., "Jun 15")
      const date = new Date(day)
      const formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

      return {
        name: formattedDate,
        scans: count,
      }
    })

    setScansByDay(scanCounts)
  }, [scanHistory])

  const COLORS = ["#4ade80", "#facc15", "#f87171"]

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Threat Analysis Dashboard</CardTitle>
        <CardDescription>Visual overview of your link scanning activity and detected threats</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Threat Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {threatDistribution.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={threatDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {threatDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                      No scan data available yet
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Scan Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-3">
                        <div className="text-xs font-medium text-muted-foreground">Total Scans</div>
                        <div className="text-2xl font-bold">{scanHistory.length}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs font-medium text-muted-foreground">Unique Domains</div>
                        <div className="text-2xl font-bold">
                          {
                            new Set(
                              scanHistory.map((scan) => {
                                try {
                                  return new URL(scan.url).hostname
                                } catch {
                                  return scan.url
                                }
                              }),
                            ).size
                          }
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs font-medium text-muted-foreground">Average Risk Score</div>
                        <div className="text-2xl font-bold">
                          {scanHistory.length > 0
                            ? Math.round(scanHistory.reduce((acc, scan) => acc + scan.score, 0) / scanHistory.length)
                            : 0}
                          %
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs font-medium text-muted-foreground">High Risk Links</div>
                        <div className="text-2xl font-bold text-red-500">
                          {scanHistory.filter((scan) => scan.score >= 70).length}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Scans Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {scansByDay.length > 0 && scansByDay.some((day) => day.scans > 0) ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scansByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="scans" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    Not enough data to show trends
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

