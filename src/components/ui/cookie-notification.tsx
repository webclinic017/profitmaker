import * as React from "react"
import { useState, useEffect } from "react"
import { X, Cookie, ExternalLink } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

const COOKIE_CONSENT_KEY = "cookie-consent"

interface CookieNotificationProps {
  className?: string
}

export function CookieNotification({ className }: CookieNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if user has previously given consent
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Add a small delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAcceptAll = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted")
    setIsVisible(false)
  }

  const handleClose = () => {
    setIsVisible(false)
  }

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-md",
        "rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "shadow-lg animate-in slide-in-from-bottom-5 fade-in-20 duration-300",
        "sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-md",
        className
      )}
    >
      <div className="relative overflow-hidden">
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        
        <div className="flex items-start p-5">
          <div className="flex-shrink-0 mr-4 mt-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="text-sm font-medium text-foreground">Cookie Consent</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                We use cookies to improve your experience and analyze site usage.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <a 
                href="https://github.com/suenot/profitmaker/blob/master/PRIVACY_POLICY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-primary hover:underline"
              >
                <span>Privacy Policy</span>
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
              
              <div className="flex-1 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  className="text-xs h-8"
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  className="text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Accept All
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Close button - absolute positioned for better layout */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-3 right-3 h-6 w-6 p-0 rounded-full opacity-70 hover:opacity-100 transition-opacity"
        onClick={handleClose}
      >
        <X className="h-3.5 w-3.5" />
        <span className="sr-only">Close</span>
      </Button>
    </div>
  )
} 