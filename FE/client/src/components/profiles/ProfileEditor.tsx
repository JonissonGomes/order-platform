import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { qk } from "@/hooks/queries";
import { api } from "@/lib/api";
import {
  PERMISSION_CATALOG,
  permissionKey,
  permissionsToToggleState,
  toggleStateToPermissions,
} from "@/lib/permissions";
import type { Profile } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface ProfileEditorProps {
  profile: Profile | null;
  creating: boolean;
  canEdit: boolean;
  onCreated: (profile: Profile) => void;
  onCancelCreate: () => void;
}

export function ProfileEditor({
  profile,
  creating,
  canEdit,
  onCreated,
  onCancelCreate,
}: ProfileEditorProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (creating) {
      setName("");
      setDescription("");
      setToggles(permissionsToToggleState([]));
      return;
    }
    setName(profile?.name ?? "");
    setDescription(profile?.description ?? "");
    setToggles(permissionsToToggleState(profile?.permissions));
  }, [creating, profile]);

  const actionColumns = useMemo(() => {
    const seen = new Map<string, string>();
    for (const mod of PERMISSION_CATALOG) {
      for (const a of mod.actions) {
        if (!seen.has(a.key)) seen.set(a.key, a.label);
      }
    }
    return Array.from(seen.entries()).map(([key, label]) => ({ key, label }));
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      const permissions = toggleStateToPermissions(toggles);
      if (permissions.length === 0) throw new Error("Selecione ao menos uma permissão");
      if (creating) {
        return api.profiles.create({
          name: name.trim(),
          description: description.trim() || undefined,
          permissions,
        });
      }
      if (!profile) throw new Error("Selecione um perfil");
      return api.profiles.update(profile.id, {
        name: profile.isDefault ? undefined : name.trim(),
        description: description.trim() || undefined,
        permissions,
      });
    },
    onSuccess: saved => {
      queryClient.invalidateQueries({ queryKey: qk.profiles });
      toast.success(creating ? "Perfil criado" : "Perfil atualizado");
      if (creating && saved) onCreated(saved);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setActive = useMutation({
    mutationFn: (isActive: boolean) => {
      if (!profile || profile.isDefault) throw new Error("Perfil padrão não pode alterar status");
      return api.profiles.update(profile.id, { isActive });
    },
    onSuccess: (_data, isActive) => {
      queryClient.invalidateQueries({ queryKey: qk.profiles });
      toast.success(isActive ? "Perfil reativado" : "Perfil desativado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setAction = (key: string, on: boolean) => {
    if (!canEdit) return;
    setToggles(prev => ({ ...prev, [key]: on }));
  };

  if (!creating && !profile) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">Selecione um perfil.</p>
    );
  }

  const validName = name.trim().length > 0;
  const hasPerms = Object.values(toggles).some(Boolean);
  const nameLocked = Boolean(profile?.isDefault) && !creating;

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-[minmax(12rem,16rem)_1fr]">
        <Input
          aria-label="Nome"
          placeholder="Nome *"
          value={name}
          disabled={!canEdit || nameLocked}
          onChange={e => setName(e.target.value)}
        />
        <Input
          aria-label="Descrição"
          placeholder="Descrição"
          value={description}
          disabled={!canEdit}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      {/* Mobile: lista empilhada, sem scroll horizontal */}
      <ul className="md:hidden divide-y border rounded-md">
        {PERMISSION_CATALOG.map(mod => (
          <li key={mod.resource} className="px-3 py-3 space-y-2">
            <p className="text-sm font-medium">{mod.label}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {mod.actions.map(action => {
                const key = permissionKey(mod.resource, action.key);
                return (
                  <label key={key} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={Boolean(toggles[key])}
                      disabled={!canEdit}
                      onCheckedChange={v => setAction(key, v === true)}
                    />
                    {action.label}
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: matriz full-width */}
      <table className="hidden md:table w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2.5 pr-4 font-medium w-[28%]">Módulo</th>
            {actionColumns.map(col => (
              <th key={col.key} className="px-2 py-2.5 text-center font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_CATALOG.map(mod => {
            const actionKeys = new Set(mod.actions.map(a => a.key));
            return (
              <tr key={mod.resource} className="border-b border-border/50 last:border-0">
                <td className="py-3 pr-4 font-medium">{mod.label}</td>
                {actionColumns.map(col => {
                  if (!actionKeys.has(col.key)) {
                    return <td key={col.key} className="px-2 py-3" />;
                  }
                  const key = permissionKey(mod.resource, col.key);
                  return (
                    <td key={col.key} className="px-2 py-3 text-center">
                      <Checkbox
                        checked={Boolean(toggles[key])}
                        disabled={!canEdit}
                        onCheckedChange={v => setAction(key, v === true)}
                        aria-label={`${mod.label} — ${col.label}`}
                        className="mx-auto"
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {canEdit && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {creating ? (
            <Button type="button" variant="ghost" size="sm" onClick={onCancelCreate}>
              Cancelar
            </Button>
          ) : profile && !profile.isDefault ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={setActive.isPending || save.isPending}
              onClick={() => setActive.mutate(!profile.isActive)}
            >
              {profile.isActive ? "Desativar" : "Reativar"}
            </Button>
          ) : null}
          <Button
            size="sm"
            disabled={!validName || !hasPerms || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Salvando…" : creating ? "Criar" : "Salvar"}
          </Button>
        </div>
      )}
    </div>
  );
}
