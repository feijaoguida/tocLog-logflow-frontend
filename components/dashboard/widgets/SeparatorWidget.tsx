
import { cn } from "@/lib/utils"

interface SeparatorWidgetProps {
    orientation?: 'horizontal' | 'vertical'
    config?: {
        lineColor?: string
        thickness?: number
        lineStyle?: 'solid' | 'dashed' | 'dotted'
        lineCap?: 'butt' | 'round' | 'square'
    }
}

export function SeparatorWidget({ orientation = 'horizontal', config }: SeparatorWidgetProps) {
    const {
        lineColor = '#e2e8f0', // slate-200 default
        thickness = 2,
        lineStyle = 'solid',
        lineCap = 'butt'
    } = config || {}

    // We render a div that acts as the line.
    // For horizontal: width 100%, height = thickness
    // For vertical: height 100%, width = thickness
    
    // We can't use 'border' easily for thickness > 1px comfortably without calculating borders.
    // Easiest is to use the div background as the line color if solid, but for dashed/dotted we need border.
    
    // Better approach: Use SVG line for perfect control over dashes and caps?
    // Or standard CSS border.
    // width/height approach implies "background color" is the line color.
    // But "dashed" background is hard.
    
    // CSS Border approach:
    // H: border-top
    // V: border-left
    
    const style: React.CSSProperties = {
        borderColor: lineColor,
        borderStyle: lineStyle,
    }

    if (orientation === 'horizontal') {
        style.borderTopWidth = `${thickness}px`
        style.width = '100%'
        style.height = '0px'
    } else {
        style.borderLeftWidth = `${thickness}px`
        style.height = '100%'
        style.width = '0px'
    }

    // LineCap in CSS is not supported for borders, only for SVG.
    // If user really wants 'round' caps on a dashed border, we need SVG or complicated CSS.
    // If style is 'solid', we can use borderRadius for the container 'div' acting as the line.
    // If style is 'dashed', border-radius affects the corners of the element, not the dashes.
    
    // Implementing SVG for full support of user requirements.
    
    return (
        <div className="h-full w-full flex items-center justify-center">
            {/* SVG Container */}
            <svg 
                width="100%" 
                height="100%" 
                className="overflow-visible"
            >
                {orientation === 'horizontal' ? (
                    <line 
                        x1="0" y1="50%" 
                        x2="100%" y2="50%" 
                        stroke={lineColor} 
                        strokeWidth={thickness} 
                        strokeDasharray={lineStyle === 'dashed' ? '10,5' : lineStyle === 'dotted' ? '2,2' : undefined}
                        strokeLinecap={lineCap}
                    />
                ) : (
                    <line 
                        x1="50%" y1="0" 
                        x2="50%" y2="100%" 
                        stroke={lineColor} 
                        strokeWidth={thickness} 
                        strokeDasharray={lineStyle === 'dashed' ? '10,5' : lineStyle === 'dotted' ? '2,2' : undefined}
                        strokeLinecap={lineCap}
                    />
                )}
            </svg>
        </div>
    )
}
