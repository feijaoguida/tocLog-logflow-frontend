
'use client'
import { PublicFeed } from "@/components/feed/public-feed"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function FeedWidget() {
    return (
        <Card className="h-full overflow-hidden flex flex-col">
            <CardHeader className="pb-0 pt-3 px-4">
                <CardTitle className="text-sm font-medium">Feed</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 min-h-0">
                <div className="p-2">
                     <PublicFeed />
                </div>
            </CardContent>
        </Card>
    )
}
