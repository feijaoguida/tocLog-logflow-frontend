'use client'

import React, { useState, useCallback } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'

interface ImageCropperProps {
    open: boolean
    imageSrc: string
    onComplete: (croppedImageBlob: Blob) => void
    onCancel: () => void
}

export function ImageCropper({ open, imageSrc, onComplete, onCancel }: ImageCropperProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image()
            image.addEventListener('load', () => resolve(image))
            image.addEventListener('error', (error) => reject(error))
            image.setAttribute('crossOrigin', 'anonymous')
            image.src = url
        })

    const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
        const image = await createImage(imageSrc)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('No 2d context')

        canvas.width = pixelCrop.width
        canvas.height = pixelCrop.height

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        )

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob)
            }, 'image/jpeg')
        })
    }

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
            onComplete(croppedImageBlob)
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Recortar Imagem</DialogTitle>
                </DialogHeader>
                
                <div className="relative w-full h-[300px] bg-black rounded-md overflow-hidden">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>

                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Zoom</Label>
                        <Slider 
                            value={[zoom]} 
                            min={1} 
                            max={3} 
                            step={0.1} 
                            onValueChange={(vals: number[]) => setZoom(vals[0])} 
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
                    <Button onClick={handleSave}>Confirmar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
