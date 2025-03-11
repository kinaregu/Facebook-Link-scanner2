"use server"

// Database simulation for storing feedback and improving the system
const threatDatabase: Record<
  string,
  {
    score: number
    feedbackCount: number
    positiveCount: number
    negativeCount: number
  }
> = {
  "https://example.com/potential-phishing-site": {
    score: 75,
    feedbackCount: 12,
    positiveCount: 10,
    negativeCount: 2,
  },
  "https://trusted-news-source.com/article/123": {
    score: 15,
    feedbackCount: 8,
    positiveCount: 7,
    negativeCount: 1,
  },
  "https://suspicious-download.net/free-software": {
    score: 85,
    feedbackCount: 15,
    positiveCount: 13,
    negativeCount: 2,
  },
  "https://legitimate-business.com/products": {
    score: 20,
    feedbackCount: 9,
    positiveCount: 8,
    negativeCount: 1,
  },
  "https://known-malware-distributor.com/download": {
    score: 95,
    feedbackCount: 20,
    positiveCount: 19,
    negativeCount: 1,
  },
}

// Validate if a string is a properly formatted URL
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

// Step 2: Process links and perform threat assessment
export async function processLinks(url: string) {
  try {
    // Validate URL format
    if (!isValidUrl(url)) {
      return {
        threatAssessmentScore: 100,
        details: "Invalid URL format. Please enter a valid URL starting with http:// or https://",
      }
    }

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Check if the URL is in our database
    if (threatDatabase[url]) {
      return {
        threatAssessmentScore: threatDatabase[url].score,
        details: generateThreatDetails(url, threatDatabase[url].score),
      }
    }

    // For new URLs, perform a basic assessment based on URL patterns
    const score = assessUrlThreat(url)

    // Store the result in our database
    threatDatabase[url] = {
      score,
      feedbackCount: 0,
      positiveCount: 0,
      negativeCount: 0,
    }

    return {
      threatAssessmentScore: score,
      details: generateThreatDetails(url, score),
    }
  } catch (error) {
    console.error("Error processing link:", error)
    throw new Error("Failed to process link")
  }
}

// Step 5 & Feedback Loop: Refine threat assessment based on user feedback
export async function refineThreatAssessment(url: string, feedback: "positive" | "negative") {
  try {
    // If the URL is not in our database, we can't refine it
    if (!threatDatabase[url]) {
      return false
    }

    // Update feedback counts
    threatDatabase[url].feedbackCount += 1

    if (feedback === "positive") {
      threatDatabase[url].positiveCount += 1
    } else {
      threatDatabase[url].negativeCount += 1
    }

    // Adjust the score based on feedback
    // If users consistently mark it as inaccurate, adjust the score
    const accuracyRatio = threatDatabase[url].positiveCount / threatDatabase[url].feedbackCount

    if (accuracyRatio < 0.7 && threatDatabase[url].feedbackCount >= 3) {
      // If the assessment is consistently marked inaccurate, adjust the score
      // For high scores, reduce them; for low scores, increase them
      if (threatDatabase[url].score > 50) {
        threatDatabase[url].score = Math.max(30, threatDatabase[url].score - 10)
      } else {
        threatDatabase[url].score = Math.min(70, threatDatabase[url].score + 10)
      }
    }

    return true
  } catch (error) {
    console.error("Error refining threat assessment:", error)
    throw new Error("Failed to refine threat assessment")
  }
}

// Helper function to assess URL threat based on patterns
function assessUrlThreat(url: string): number {
  let score = 50 // Start with a neutral score

  // Check for suspicious TLDs
  if (url.match(/\.(xyz|tk|ml|ga|cf|gq|top)$/i)) {
    score += 15
  }

  // Check for trusted TLDs
  if (url.match(/\.(gov|edu)$/i)) {
    score -= 20
  }

  // Check for suspicious keywords in URL
  if (url.match(/(free|win|prize|discount|deal|offer|limited|exclusive)/i)) {
    score += 10
  }

  // Check for security indicators
  if (url.startsWith("https://")) {
    score -= 5
  } else {
    score += 10
  }

  // Check for suspicious patterns
  if (url.match(/[0-9]{5,}/)) {
    score += 5 // Long number sequences
  }

  if (url.match(/[a-zA-Z0-9]{15,}\./)) {
    score += 10 // Very long domain name
  }

  // Ensure score is within bounds
  return Math.max(0, Math.min(100, score))
}

// Generate detailed explanation based on the score
function generateThreatDetails(url: string, score: number): string {
  if (score < 30) {
    return "This link appears to be safe. It follows security best practices and doesn't contain suspicious patterns."
  } else if (score < 70) {
    return "This link has some suspicious characteristics but isn't definitively malicious. Exercise caution when visiting."
  } else {
    return "This link shows multiple high-risk indicators and may be unsafe. It's recommended to avoid visiting this website."
  }
}

