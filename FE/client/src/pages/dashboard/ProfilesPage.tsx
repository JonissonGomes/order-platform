import { ProfileFormDialog } from "@/components/profiles/ProfileFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/zts/EmptyState";
import { ListPagination } from "@/components/zts/ListPagination";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useProfiles } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";
import { summarizePermissions } from "@/lib/permissions";
import type { Profile } from "@/types";
import { Pencil, Plus, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

export default function ProfilesPage() {
  const { isAdmin } = usePermissions();
  const { data, isPending, error, refetch } = useProfiles();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);

  const list = useMemo(
    () => (data ?? []).filter(p => p.name !== "Super Admin" && (p.isActive || isAdmin)),
    [data, isAdmin]
  );

  const { page, pageCount, total, pageSize, pageItems, setPage } = useClientPagination(list, 6);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (profile: Profile) => {
    setEditing(profile);
    setEditorOpen(true);
  };

  return (
    <div>
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Novo perfil
          </Button>
        </div>
      )}

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nenhum perfil encontrado" />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {pageItems.map(profile => (
              <Card key={profile.id} className="gap-3 py-4">
                <CardHeader className="px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-sm">{profile.name}</CardTitle>
                        {profile.isDefault && (
                          <Badge variant="outline" className="rounded-sm text-[0.6875rem]">
                            Padrão
                          </Badge>
                        )}
                        {!profile.isActive && (
                          <Badge variant="secondary" className="rounded-sm text-[0.6875rem]">
                            Inativo
                          </Badge>
                        )}
                      </div>
                      {profile.description && (
                        <CardDescription>{profile.description}</CardDescription>
                      )}
                    </div>
                    {isAdmin && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => openEdit(profile)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 space-y-2">
                  {summarizePermissions(profile.permissions ?? []).map(([label, actions]) => (
                    <div key={label} className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-medium w-32 shrink-0">{label}</span>
                      {actions.map(a => (
                        <Badge key={a} variant="secondary" className="rounded-sm text-[0.6875rem]">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
          <ListPagination
            page={page}
            pageCount={pageCount}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </>
      )}

      {isAdmin && (
        <ProfileFormDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          profile={editing}
        />
      )}
    </div>
  );
}
