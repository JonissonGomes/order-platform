import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { qk } from "@/hooks/queries";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Note } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function OrderNotes({ orderId, notes }: { orderId: string; notes: Note[] }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const add = useMutation({
    mutationFn: () => api.serviceOrders.addNote(orderId, content.trim(), isPublic),
    onSuccess: () => {
      setContent("");
      setIsPublic(false);
      queryClient.invalidateQueries({ queryKey: qk.orders });
      queryClient.invalidateQueries({ queryKey: ["service-order", orderId] });
      toast.success("Observação adicionada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="space-y-2">
      <h3 className="zts-eyebrow">Observações</h3>
      {notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma observação registrada.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map(n => (
            <li key={n.id} className="border rounded-sm bg-muted/40 p-2.5 text-sm">
              <p>{n.content}</p>
              <p className="text-[0.6875rem] text-muted-foreground mt-1 flex items-center gap-1.5">
                {formatDateTime(n.createdAt)}
                {n.isPublic && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Eye className="h-3 w-3" /> visível ao cliente
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Adicionar observação…"
        rows={2}
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Checkbox id="note-public" checked={isPublic} onCheckedChange={v => setIsPublic(v === true)} />
          <Label htmlFor="note-public" className="text-xs font-normal cursor-pointer">
            Mostrar no portal do cliente
          </Label>
        </div>
        <Button size="sm" variant="outline" disabled={!content.trim() || add.isPending}
          onClick={() => add.mutate()}>
          Adicionar
        </Button>
      </div>
    </section>
  );
}
