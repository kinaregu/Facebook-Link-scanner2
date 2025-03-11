"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Shield, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react"
import { captureLinks } from "./api-integration"
import { processLinks, refineThreatAssessment } from "./real-time-link-scanning"
import { ThemeToggle } from "./theme-toggle"
import { DashboardView } from "./dashboard-view"
import { ScrollArea } from "./ui/scroll-area"

type ScanResult = {
  url: string
  score: number
  details: string
  timestamp: Date
}

export function UserControlInterface() {
  // State for current scan results
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  // State for scan history
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<Record<string, "positive" | "negative">>({})
  const [manualUrl, setManualUrl] = useState("")
  const [bulkUrls, setBulkUrls] = useState("")

  // Load scan history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("scanHistory")
    if (savedHistory) {
      try {
        // Parse the saved history and convert string timestamps back to Date objects
        const parsedHistory = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }))
        setScanHistory(parsedHistory)
      } catch (error) {
        console.error("Error loading scan history:", error)
      }
    }
  }, [])

  // Save scan history to localStorage whenever it changes
  useEffect(() => {
    if (scanHistory.length > 0) {
      localStorage.setItem("scanHistory", JSON.stringify(scanHistory))
    }
  }, [scanHistory])

  // Step 3: Display results to the user
  const displayResults = (results: { url: string; score: number; details: string }) => {
    const newResult = { ...results, timestamp: new Date() }
    setScanResults((prev) => [newResult, ...prev])

    // Also add to scan history
    setScanHistory((prev) => {
      // Limit history to 100 items to prevent localStorage from getting too large
      const updatedHistory = [newResult, ...prev].slice(0, 100)
      return updatedHistory
    })

    setLoading(false)
  }

  // Step 4: User makes a decision on the threat assessment
  const userDecision = async (url: string, decision: "positive" | "negative") => {
    setFeedback((prev) => ({
      ...prev,
      [url]: decision,
    }))

    // Step 5: Feed user actions back into the system
    await feedbackUserActions(url, decision)
  }

  // Step 5: Send feedback to improve the system
  const feedbackUserActions = async (url: string, decision: "positive" | "negative") => {
    try {
      await refineThreatAssessment(url, decision)
    } catch (error) {
      console.error("Error sending feedback:", error)
    }
  }

  // Initiate the scanning process for Facebook links
  const scanFacebookLinks = async () => {
    setLoading(true)
    try {
      // Step 1: Capture links from Facebook
      const links = await captureLinks()

      // Step 2: Process links and get threat assessment
      for (const link of links) {
        const result = await processLinks(link)
        displayResults({
          url: link,
          score: result.threatAssessmentScore,
          details: result.details,
        })
      }
    } catch (error) {
      console.error("Error scanning links:", error)
      setLoading(false)
    }
  }

  // Scan a manually entered link
  const scanManualLink = async () => {
    if (!manualUrl.trim()) return

    setLoading(true)
    try {
      // Process the manually entered link
      const result = await processLinks(manualUrl)
      displayResults({
        url: manualUrl,
        score: result.threatAssessmentScore,
        details: result.details,
      })

      // Clear the input field after scanning
      setManualUrl("")
    } catch (error) {
      console.error("Error scanning manual link:", error)
      setLoading(false)
    }
  }

  // Scan multiple links at once
  const scanBulkLinks = async () => {
    if (!bulkUrls.trim()) return

    setLoading(true)
    try {
      // Split the text by newlines, commas, or spaces to get individual URLs
      const links = bulkUrls
        .split(/[\n,\s]+/)
        .map((url) => url.trim())
        .filter((url) => url.length > 0)

      // Process each link
      for (const link of links) {
        const result = await processLinks(link)
        displayResults({
          url: link,
          score: result.threatAssessmentScore,
          details: result.details,
        })
      }

      // Clear the input field after scanning
      setBulkUrls("")
    } catch (error) {
      console.error("Error scanning bulk links:", error)
      setLoading(false)
    }
  }

  // Clear scan history
  const clearScanHistory = () => {
    setScanHistory([])
    localStorage.removeItem("scanHistory")
  }

  const getThreatLevel = (score: number) => {
    if (score < 30) return { level: "Low", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" }
    if (score < 70)
      return { level: "Medium", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" }
    return { level: "High", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" }
  }

  // Render scan result card
  const renderScanResultCard = (result: ScanResult, index: number) => {
    const threat = getThreatLevel(result.score)
    return (
      <Card key={index} className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="truncate flex-1 mr-2">
              <CardTitle className="text-sm font-medium">{result.url}</CardTitle>
              <CardDescription className="text-xs">{result.timestamp.toLocaleString()}</CardDescription>
            </div>
            <Badge className={threat.color}>
              {threat.level} Risk ({result.score}%)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-2 text-sm">
          <p>{result.details}</p>
        </CardContent>
        <CardFooter className="pt-0 flex justify-end gap-2">
          <Button
            variant={feedback[result.url] === "positive" ? "default" : "outline"}
            size="sm"
            onClick={() => userDecision(result.url, "positive")}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            Accurate
          </Button>
          <Button
            variant={feedback[result.url] === "negative" ? "default" : "outline"}
            size="sm"
            onClick={() => userDecision(result.url, "negative")}
          >
            <ThumbsDown className="h-4 w-4 mr-1" />
            Inaccurate
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Link Scanner Dashboard</h1>
        <ThemeToggle />
      </div>

      <Tabs defaultValue="scan" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="scan">Scan</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="scan">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Scan a Specific Link</h3>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button onClick={scanManualLink} disabled={loading || !manualUrl.trim()}>
                  Scan
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Bulk Scan Multiple Links</h3>
              <div className="space-y-2">
                <Textarea
                  placeholder="Enter multiple URLs (one per line or separated by commas)"
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button onClick={scanBulkLinks} disabled={loading || !bulkUrls.trim()} className="w-full">
                  {loading ? "Scanning..." : "Scan All Links"}
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Scan Facebook Links</h3>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Facebook Integration</AlertTitle>
                <AlertDescription>
                  Click the button below to scan links from your Facebook feed for potential threats.
                </AlertDescription>
              </Alert>

              <Button onClick={scanFacebookLinks} disabled={loading} className="w-full">
                {loading ? "Scanning..." : "Scan Facebook Links"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="results">
          {scanResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scan results yet. Start a scan to see results here.
            </div>
          ) : (
            <div className="space-y-4">{scanResults.map((result, index) => renderScanResultCard(result, index))}</div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Scan History</h3>
            {scanHistory.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearScanHistory}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear History
              </Button>
            )}
          </div>

          {scanHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scan history available. Scanned links will be saved here automatically.
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">{scanHistory.map((result, index) => renderScanResultCard(result, index))}</div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="dashboard">
          <DashboardView scanHistory={scanHistory} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

