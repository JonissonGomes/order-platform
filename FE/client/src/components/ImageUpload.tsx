import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { Upload, X, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import type { Image } from "@/types";

interface ImageUploadProps {
  value?: Image[];
  onChange: (images: Image[]) => void;
  folder?: string;
  maxImages?: number;
}

export function ImageUpload({ value = [], onChange, folder = "doutor_game", maxImages = 5 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<{ index: number; image: Image } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (value.length + files.length > maxImages) {
      toast.error(`Máximo de ${maxImages} imagens permitidas`);
      return;
    }

    setUploading(true);
    const newImages: Image[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} não é uma imagem válida`);
          continue;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} é muito grande (máximo 10MB)`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload/image?folder=${folder}`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao fazer upload");
        }

        const result = await response.json();
        newImages.push({
          id: result.publicId,
          url: result.url,
          publicId: result.publicId,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: "",
        });
      }

      onChange([...value, ...newImages]);
      toast.success(`${newImages.length} imagem(ns) enviada(s) com sucesso!`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer upload das imagens");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    const image = value[index];
    if (!image) return;
    
    // Validação: verificar se a imagem tem publicId (foi enviada para Cloudinary)
    if (!image.publicId) {
      // Se não tem publicId, pode ser uma imagem local que ainda não foi enviada
      // Remove diretamente sem confirmação
      const newImages = value.filter((_, i) => i !== index);
      onChange(newImages);
      return;
    }
    
    // Abre o diálogo de confirmação
    setImageToDelete({ index, image });
  };

  const confirmDelete = async () => {
    if (!imageToDelete) return;

    const { index, image } = imageToDelete;
    setDeleting(image.publicId);

    try {
      // Deletar do Cloudinary
      await api.deleteImage(image.publicId);
      
      // Remover do array local apenas se a deleção foi bem-sucedida
      const newImages = value.filter((_, i) => i !== index);
      onChange(newImages);
      
      toast.success("Imagem removida com sucesso");
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover imagem do Cloudinary");
    } finally {
      setDeleting(null);
      setImageToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Imagens ({value.length}/{maxImages})</Label>
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={uploading || value.length >= maxImages}
            className="hidden"
            id="image-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || value.length >= maxImages}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Adicionar Imagens
              </>
            )}
          </Button>
        </div>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {value.map((image, index) => (
            <div key={image.id || index} className="relative group">
              <img
                src={image.url}
                alt={`Upload ${index + 1}`}
                className="w-full h-32 object-cover rounded-md border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(index)}
                disabled={deleting === image.publicId}
              >
                {deleting === image.publicId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Dialog de confirmação para deletar imagem */}
      <AlertDialog open={imageToDelete !== null} onOpenChange={(open) => !open && setImageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta imagem? Esta ação não pode ser desfeita e a imagem será permanentemente deletada do Cloudinary.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
