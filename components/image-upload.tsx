'use client'

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ImageUploadProps {
    value?: string | null
    onChange: (url: string) => void
    folder: 'funcionario' | 'post'
    className?: string
    placeholder?: string
}

export function ImageUpload({ value, onChange, folder, className, placeholder = "Carregar imagem" }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append('file', file)

        setUploading(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:3000/uploads/${folder}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (!response.ok) {
                throw new Error('Falha no upload')
            }

            const data = await response.json()
            // Backend returns { url, filename, path }
            // We assume backend serves /files pointing to uploads
            // Ensure URL is absolute or handled correctly by receiver. 
            // The backend returns "/files/..." which is relative to domain. 
            // If running on localhost:3000, we stick with relative or prepend.
            // But if we want to store the FULL URL, we might need to handle that.
            // For now, let's store the relative path as returned by backend.
            
            // Actually, for the Avatar component to work, it needs http if on different port?
            // NextJS is 3001 (maybe?) Backend 3000.
            // If backend returns `/files/img.jpg`, and we are on 3001, `<img src="/files..">` will check 3001.
            // So we should prepend the backend URL if it is relative.
            const fullUrl = `http://localhost:3000${data.url}`
            
            onChange(fullUrl)
            toast.success("Imagem carregada com sucesso!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao carregar imagem")
        } finally {
            setUploading(false)
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    return (
        <div className={`flex flex-col gap-4 ${className}`}>
             <div className="flex items-center gap-4">
                {value ? (
                    <div className="relative h-24 w-24 rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={value} alt="Preview" className="h-full w-full object-cover" />
                        <button 
                            type="button"
                            onClick={() => onChange("")}
                            className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <div className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 text-slate-400">
                        <ImageIcon className="h-8 w-8 opacity-50" />
                    </div>
                )}
                
                <div className="flex flex-col gap-2">
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleUpload}
                    />
                    <Button 
                        type="button" 
                        variant="outline" 
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-fit"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" /> {value ? "Trocar Imagem" : placeholder}
                            </>
                        )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        JPG, PNG ou GIF. Máx 5MB.
                    </p>
                </div>
            </div>
        </div>
    )
}
