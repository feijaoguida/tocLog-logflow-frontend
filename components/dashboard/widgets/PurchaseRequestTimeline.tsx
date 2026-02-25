
import { CheckCircle2, Circle, Clock, FileText, Ban, DollarSign, PackageCheck } from "lucide-react"

interface TimelineProps {
    status: string
    approvalDate?: string
    rejectedDate?: string
    createdAt: string
}

const STEPS = [
    { key: 'DRAFT', label: 'Rascunho', icon: FileText },
    { key: 'PENDING', label: 'Aprovação', icon: Clock },
    { key: 'IN_QUOTATION', label: 'Cotação', icon: DollarSign },
    { key: 'APPROVED', label: 'Aprovado', icon: CheckCircle2 },
    { key: 'COMPLETED', label: 'Concluído', icon: PackageCheck },
]

export function PurchaseRequestTimeline({ status, approvalDate, rejectedDate, createdAt }: TimelineProps) {
    
    // Helper to determine step state
    const getStepState = (stepKey: string, index: number) => {
        // Special Case: Rejected
        if (status === 'REJECTED') {
            if (stepKey === 'DRAFT') return 'completed'
            if (stepKey === 'PENDING') return 'rejected'
            return 'inactive'
        }

        const currentIdx = STEPS.findIndex(s => s.key === status)
        if (index < currentIdx) return 'completed'
        if (index === currentIdx) return 'current'
        return 'inactive'
    }

    return (
        <div className="w-full py-6">
            <div className="relative flex items-center justify-between w-full max-w-3xl mx-auto">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -z-10 -translate-y-1/2" />
                
                {STEPS.map((step, idx) => {
                    const state = getStepState(step.key, idx)
                    const Icon = step.icon

                    let bgClass = "bg-muted"
                    let textClass = "text-muted-foreground"
                    let ringClass = ""

                    if (state === 'completed') {
                        bgClass = "bg-green-500"
                        textClass = "text-green-600"
                    } else if (state === 'current') {
                        bgClass = "bg-blue-500"
                        textClass = "text-blue-600 font-semibold"
                        ringClass = "ring-4 ring-blue-100"
                    } else if (state === 'rejected') {
                        bgClass = "bg-red-500"
                        textClass = "text-red-600 font-semibold"
                        ringClass = "ring-4 ring-red-100"
                    }

                    return (
                        <div key={step.key} className="flex flex-col items-center gap-2  px-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${state === 'completed' || state === 'current' || state === 'rejected' ? 'border-transparent text-white' : 'border-muted text-muted-foreground'} ${bgClass} ${ringClass} transition-all`}>
                                {state === 'rejected' ? <Ban className="w-5 h-5"/> : <Icon className="w-5 h-5" />}
                            </div>
                            <span className={`text-xs ${textClass}`}>{step.label}</span>
                            
                            {/* Dates (Optional enhancement) */}
                            {step.key === 'DRAFT' && <span className="text-[10px] text-muted-foreground">{new Date(createdAt).toLocaleDateString()}</span>}
                            {/* {step.key === 'APPROVED' && approvalDate && <span className="text-[10px] text-muted-foreground">{new Date(approvalDate).toLocaleDateString()}</span>} */}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
