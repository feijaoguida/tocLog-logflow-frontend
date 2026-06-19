"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
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
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    
    // Cropper State
    const [cropperOpen, setCropperOpen] = useState(false)
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [originalFile, setOriginalFile] = useState<File | null>(null)

    useEffect(() => {
        return () => {
            if (previewUrl?.startsWith("blob:")) {
                URL.revokeObjectURL(previewUrl)
            }
        }
    }, [previewUrl])

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

        const localPreviewUrl = URL.createObjectURL(croppedBlob)
        if (previewUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(previewUrl)
        }
        setPreviewUrl(localPreviewUrl)

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
             <div className="flex flex-col gap-5 md:flex-row md:items-center">
                {previewUrl || value ? (
                    <div className="relative h-32 w-32 overflow-hidden rounded-3xl border border-border bg-card shadow-sm group">
                        <Image
                            src={previewUrl || value || ""}
                            alt="Preview"
                            fill
                            unoptimized
                            className="object-cover"
                        />
                        <button 
                            type="button"
                            onClick={() => {
                                if (previewUrl?.startsWith("blob:")) {
                                    URL.revokeObjectURL(previewUrl)
                                }
                                setPreviewUrl(null)
                                onChange("")
                            }}
                            className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-3xl border-2 border-dashed border-border bg-muted/50 text-muted-foreground">
                        <ImageIcon className="h-10 w-10 opacity-60" />
                    </div>
                )}
                
                <div className="flex max-w-md flex-1 flex-col gap-3">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                            {value ? "Imagem pronta para revisão" : "Envie uma foto nítida do colaborador"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Use preferencialmente uma imagem centralizada, com rosto visível e fundo limpo para manter o padrão visual.
                        </p>
                    </div>
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                    />
                    <Button 
                        type="button" 
                        variant="outlinePrimary" 
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
                    <div className="rounded-2xl border border-border/70 bg-card/80 px-3 py-2 text-xs text-muted-foreground">
                        JPG, PNG ou GIF. Máx 5MB. O recorte continua disponível antes do upload.
                    </div>
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
