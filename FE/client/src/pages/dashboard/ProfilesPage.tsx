import { ProfileEditor } from "@/components/profiles/ProfileEditor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/zts/EmptyState";
import { useProfiles } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";
import type { Profile } from "@/types";
import { Plus, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function ProfilesPage() {
  const { isAdmin } = usePermissions();
  const { data, isPending, error, refetch } = useProfiles();
  const [selectedId, setSelectedId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const list = useMemo(
    () => (data ?? []).filter(p => p.name !== "Super Admin" && (p.isActive || isAdmin)),
    [data, isAdmin]
  );

  useEffect(() => {
    if (creating) return;
    if (list.length === 0) {
      setSelectedId("");
      return;
    }
    if (!selectedId || !list.some(p => p.id === selectedId)) {
      setSelectedId(list[0].id);
    }
  }, [list, selectedId, creating]);

  const selected = list.find(p => p.id === selectedId) ?? null;

  const startCreate = () => {
    setCreating(true);
    setSelectedId("");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex items-center justify-center gap-2">
        <Select
          value={creating ? "__new__" : selectedId || undefined}
          disabled={list.length === 0 && !creating}
          onValueChange={v => {
            if (v === "__new__") {
              startCreate();
              return;
            }
            setCreating(false);
            setSelectedId(v);
          }}
        >
          <SelectTrigger className="h-9 w-full max-w-sm">
            <SelectValue placeholder="Perfil" />
          </SelectTrigger>
          <SelectContent>
            {creating && <SelectItem value="__new__">Novo perfil…</SelectItem>}
            {list.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                {!p.isActive ? " (inativo)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && !creating && (
          <Button size="sm" variant="outline" className="shrink-0" onClick={startCreate}>
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        )}
      </div>

      {isPending ? (
        <Skeleton className="h-56 w-full" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : list.length === 0 && !creating ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhum perfil encontrado"
          action={
            isAdmin ? (
              <Button size="sm" onClick={startCreate}>
                <Plus className="h-4 w-4" /> Novo perfil
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ProfileEditor
          profile={creating ? null : selected}
          creating={creating}
          canEdit={isAdmin}
          onCreated={p => {
            setCreating(false);
            setSelectedId(p.id);
          }}
          onCancelCreate={() => {
            setCreating(false);
            if (list[0]) setSelectedId(list[0].id);
          }}
        />
      )}
    </div>
  );
}
