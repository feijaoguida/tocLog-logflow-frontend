import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FeedComponent } from "./components/feed-component"
import { FeedbackWidget } from "./components/feedback-widget"

export default function HRPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
       {/* Main Feed Area - Full Width */}
       <div className="w-full max-w-7xl mx-auto">
           <FeedComponent />
       </div>

       {/* Secondary Widgets Row - Future Expansion */}
       {/* 
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full max-w-7xl mx-auto">
           {/* Widgets moved to sidebar inside FeedComponent 
       </div>
       */}
    </div>
  )
}
