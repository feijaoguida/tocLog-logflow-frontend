'use client'

import { useEffect, useState } from "react"
import { MenuFunctionHeader } from "@/components/layout/menu-function-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Check, X, FileText, Upload } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { api } from "@/lib/api"

interface EmployeeProfile { id: string; userId: string; user: { name: string } }
interface MedicalCertificate {
    id: string; startDate: string; endDate: string; description: string
    fileUrls: string[]; status: string; rejectionReason: string | null
    employee: { user: { name: string } }; manager?: { user: { name: string } } | null
    hr?: { user: { name: string } } | null; createdAt: string
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
    SUBMITTED: { label: 'Enviado', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    MANAGER_APPROVED: { label: 'Aprovado (Gestor)', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    HR_APPROVED: { label: 'Aprovado (RH)', className: 'bg-green-100 text-green-800 border-green-200' },
    MANAGER_REJECTED: { label: 'Reprovado (Gestor)', className: 'bg-red-100 text-red-800 border-red-200' },
    HR_REJECTED: { label: 'Reprovado (RH)', className: 'bg-red-100 text-red-800 border-red-200' },
}

export default function CertificatesPage() {
    const [loading, setLoading] = useState(false)
    const [myProfile, setMyProfile] = useState<EmployeeProfile | null>(null)
    const [myCertificates, setMyCertificates] = useState<MedicalCertificate[]>([])
    const [pendingManager, setPendingManager] = useState<MedicalCertificate[]>([])
    const [pendingHR, setPendingHR] = useState<MedicalCertificate[]>([])

    // Submit form
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [formLoading, setFormLoading] = useState(false)
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [description, setDescription] = useState("")
    const [files, setFiles] = useState<FileList | null>(null)

    // Rejection dialog
    const [rejectId, setRejectId] = useState<string | null>(null)
    const [rejectStatus, setRejectStatus] = useState("")
    const [rejectReason, setRejectReason] = useState("")
    const [rejectLoading, setRejectLoading] = useState(false)

    const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')
    const getStatusBadge = (status: string) => {
        const info = STATUS_BADGES[status] || { label: status, className: '' }
        return <Badge variant="outline" className={info.className}>{info.label}</Badge>
    }

    useEffect(() => { fetchInitialData() }, [])

    const fetchInitialData = async () => {
        setLoading(true)
        try {
            const { data: user } = await api.get('/auth/profile')
            const { data: employees } = await api.get('/employees')
            const me = employees.find((e: EmployeeProfile) => e.userId === user.userId || e.user.name === user.name)
            if (me) { setMyProfile(me); fetchMyCertificates(me.id); fetchAllCertificates() }
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const fetchMyCertificates = async (employeeId: string) => {
        try { const { data } = await api.get(`/medical-certificates?employeeId=${employeeId}`); setMyCertificates(data) } catch { }
    }

    const fetchAllCertificates = async () => {
        try {
            const { data } = await api.get('/medical-certificates')
            setPendingManager(data.filter((c: MedicalCertificate) => c.status === 'SUBMITTED'))
            setPendingHR(data.filter((c: MedicalCertificate) => c.status === 'MANAGER_APPROVED' || c.status === 'SUBMITTED'))
        } catch { }
    }

    const uploadFiles = async (): Promise<string[]> => {
        if (!files?.length) return []
        const urls: string[] = []
        for (let i = 0; i < files.length; i++) {
            const fd = new FormData(); fd.append('file', files[i])
            try {
                const { data } = await api.post('/uploads/atestados', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                urls.push(data.url)
            } catch { toast.error(`Erro ao enviar arquivo ${files[i].name}`) }
        }
        return urls
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!myProfile) return toast.error("Perfil não identificado")
        setFormLoading(true)
        try {
            const fileUrls = await uploadFiles()
            await api.post('/medical-certificates', {
                employeeId: myProfile.id, startDate, endDate, description, fileUrls,
            })
            toast.success("Atestado enviado!")
            setIsFormOpen(false)
            setStartDate(""); setEndDate(""); setDescription(""); setFiles(null)
            fetchMyCertificates(myProfile.id); fetchAllCertificates()
        } catch (e: any) { toast.error(e.response?.data?.message || "Erro ao enviar") }
        finally { setFormLoading(false) }
    }

    const handleApprove = async (id: string, newStatus: string) => {
        try {
            await api.patch(`/medical-certificates/${id}/status`, { status: newStatus })
            toast.success("Status atualizado!"); fetchAllCertificates()
            if (myProfile) fetchMyCertificates(myProfile.id)
        } catch (e: any) { toast.error(e.response?.data?.message || "Erro ao atualizar") }
    }

    const handleRejectConfirm = async () => {
        if (!rejectReason.trim()) return toast.error("Informe o motivo da reprovação")
        setRejectLoading(true)
        try {
            await api.patch(`/medical-certificates/${rejectId}/status`, { status: rejectStatus, rejectionReason: rejectReason })
            toast.success("Atestado reprovado"); setRejectId(null); setRejectReason("")
            fetchAllCertificates(); if (myProfile) fetchMyCertificates(myProfile.id)
        } catch (e: any) { toast.error(e.response?.data?.message || "Erro") }
        finally { setRejectLoading(false) }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>

    const renderTable = (items: MedicalCertificate[], showActions: boolean, approveStatus?: string, rejectStatusVal?: string) => (
        <Table>
            <TableHeader><TableRow>
                <TableHead>Funcionário</TableHead><TableHead>Período</TableHead>
                <TableHead>Descrição</TableHead><TableHead>Arquivos</TableHead>
                <TableHead>Status</TableHead>
                {showActions && <TableHead className="text-right">Ações</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
                {items.map(c => (
                    <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.employee.user.name}</TableCell>
                        <TableCell>{formatDate(c.startDate)} - {formatDate(c.endDate)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                            {c.description}
                            {c.rejectionReason && <p className="text-xs text-red-600 mt-1">Motivo: {c.rejectionReason}</p>}
                        </TableCell>
                        <TableCell>
                            <div className="flex gap-1">{c.fileUrls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"><FileText className="h-4 w-4" /></a>
                            ))}{c.fileUrls.length === 0 && <span className="text-muted-foreground text-xs">—</span>}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(c.status)}</TableCell>
                        {showActions && <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                {approveStatus && <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50 border-green-200" onClick={() => handleApprove(c.id, approveStatus)}><Check className="h-4 w-4 mr-1" /> Aprovar</Button>}
                                {rejectStatusVal && <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 border-red-200" onClick={() => { setRejectId(c.id); setRejectStatus(rejectStatusVal) }}><X className="h-4 w-4 mr-1" /> Reprovar</Button>}
                            </div>
                        </TableCell>}
                    </TableRow>
                ))}
                {items.length === 0 && <TableRow><TableCell colSpan={showActions ? 6 : 5} className="text-center py-6 text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>}
            </TableBody>
        </Table>
    )

    return (
        <div className="app-page">
            <MenuFunctionHeader
                title="Recursos Humanos > Atestados Medicos"
                description="Envie atestados, acompanhe aprovacoes e trate pareceres de gestor e RH no mesmo fluxo."
                actions={
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Enviar Atestado</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Enviar Atestado</DialogTitle><DialogDescription>Anexe o documento e informe o período.</DialogDescription></DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Data Início</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required /></div>
                                    <div className="space-y-2"><Label>Data Fim</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required /></div>
                                </div>
                                <div className="space-y-2"><Label>Justificativa</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o motivo..." required /></div>
                                <div className="space-y-2">
                                    <Label>Documentos</Label>
                                    <Input type="file" accept="image/*,.pdf,.doc,.docx" multiple onChange={e => setFiles(e.target.files)} />
                                    {files && files.length > 0 && <p className="text-xs text-muted-foreground flex items-center gap-1"><Upload className="h-3 w-3" /> {files.length} arquivo(s) selecionado(s)</p>}
                                </div>
                                <DialogFooter><Button type="submit" disabled={formLoading}>{formLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}Enviar</Button></DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                }
            />

            {/* Rejection reason dialog */}
            <Dialog open={!!rejectId} onOpenChange={() => { setRejectId(null); setRejectReason("") }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Motivo da Reprovação</DialogTitle><DialogDescription>Informe o motivo (obrigatório).</DialogDescription></DialogHeader>
                    <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Motivo..." className="mt-2" />
                    <DialogFooter><Button variant="destructive" onClick={handleRejectConfirm} disabled={rejectLoading}>{rejectLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}Confirmar Reprovação</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Tabs defaultValue="my-certs" className="w-full">
                <TabsList>
                    <TabsTrigger value="my-certs">Meus Atestados</TabsTrigger>
                    <TabsTrigger value="manager">Gestão ({pendingManager.length})</TabsTrigger>
                    <TabsTrigger value="hr">Administração RH ({pendingHR.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="my-certs"><Card><CardHeader className="pt-6"><CardTitle>Meus Atestados</CardTitle><CardDescription>Histórico de atestados enviados.</CardDescription></CardHeader><CardContent>{renderTable(myCertificates, false)}</CardContent></Card></TabsContent>
                <TabsContent value="manager"><Card><CardHeader className="pt-6"><CardTitle>Aprovações Pendentes (Gestor)</CardTitle><CardDescription>Atestados aguardando seu parecer.</CardDescription></CardHeader><CardContent>{renderTable(pendingManager, true, 'MANAGER_APPROVED', 'MANAGER_REJECTED')}</CardContent></Card></TabsContent>
                <TabsContent value="hr"><Card><CardHeader className="pt-6"><CardTitle>Administração RH</CardTitle><CardDescription>Atestados aguardando confirmação.</CardDescription></CardHeader><CardContent>{renderTable(pendingHR, true, 'HR_APPROVED', 'HR_REJECTED')}</CardContent></Card></TabsContent>
            </Tabs>
        </div>
    )
}
