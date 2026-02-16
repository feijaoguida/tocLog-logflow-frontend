'use client'

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { ImageCropper } from "@/components/ui/image-cropper"

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
    
    // Cropper State
    const [cropperOpen, setCropperOpen] = useState(false)
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [originalFile, setOriginalFile] = useState<File | null>(null)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Read file to data URL for cropper
        const reader = new FileReader()
        reader.addEventListener('load', () => {
            setImageSrc(reader.result?.toString() || null)
            setOriginalFile(file)
            setCropperOpen(true)
        })
        reader.readAsDataURL(file)
        
        // Reset input immediately so same file can be selected again if needed
        e.target.value = '' 
    }

    const handleCropComplete = async (croppedBlob: Blob) => {
        setCropperOpen(false)
        setUploading(true)

        const formData = new FormData()
        // Use original filename or default
        const filename = originalFile?.name || 'image.jpg'
        formData.append('file', croppedBlob, filename)

        try {
            const { data } = await api.post(`/uploads/${folder}`, formData)

            const fullUrl = `${process.env.NEXT_PUBLIC_API_URL}${data.url}`
            
            onChange(fullUrl)
            toast.success("Imagem carregada com sucesso!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao carregar imagem")
        } finally {
            setUploading(false)
            setImageSrc(null)
            setOriginalFile(null)
        }
    }

    const handleCancel = () => {
        setCropperOpen(false)
        setImageSrc(null)
        setOriginalFile(null)
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
                        onChange={handleFileSelect}
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
                        JPG, PNG ou GIF. Máx 5MB. Recorte disponível.
                    </p>
                </div>
            </div>

            {imageSrc && (
                <ImageCropper 
                    open={cropperOpen}
                    imageSrc={imageSrc}
                    onComplete={handleCropComplete}
                    onCancel={handleCancel}
                />
            )}
        </div>
    )
}
