import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/zts/EmptyState";
import { PageHeader } from "@/components/zts/PageHeader";
import { useProfiles } from "@/hooks/queries";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import type { Permission } from "@/types";
import { ShieldCheck } from "lucide-react";

const RESOURCE_LABEL = Object.fromEntries(PERMISSION_GROUPS.map(g => [g.resource, g.label]));

/** Agrupa "recurso.ação" por recurso para exibição legível. */
function groupPermissions(perms: Permission[]): [string, string[]][] {
  if (perms.includes("*")) return [["Acesso total", ["*"]]];
  const map = new Map<string, string[]>();
  perms.forEach(p => {
    const [resource, ...rest] = p.split(".");
    const action = rest.join(".") || "*";
    map.set(resource, [...(map.get(resource) ?? []), action]);
  });
  return Array.from(map.entries()).map(([r, a]) => [RESOURCE_LABEL[r] ?? r, a]);
}

export default function ProfilesPage() {
  const { data, isPending, error, refetch } = useProfiles();

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Perfis de acesso" description="Permissões de cada perfil. O menu e as telas respeitam estas regras." />

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nenhum perfil encontrado" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data!.map(profile => (
            <Card key={profile.id} className="gap-3 py-4">
              <CardHeader className="px-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{profile.name}</CardTitle>
                  {profile.isDefault && (
                    <Badge variant="outline" className="rounded-sm text-[0.6875rem]">Padrão</Badge>
                  )}
                </div>
                {profile.description && <CardDescription>{profile.description}</CardDescription>}
              </CardHeader>
              <CardContent className="px-4 space-y-2">
                {groupPermissions(profile.permissions ?? []).map(([label, actions]) => (
                  <div key={label} className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium w-32 shrink-0">{label}</span>
                    {actions.map(a => (
                      <Badge key={a} variant="secondary" className="rounded-sm font-mono text-[0.6875rem]">
                        {a === "*" ? "todas" : a}
                      </Badge>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
