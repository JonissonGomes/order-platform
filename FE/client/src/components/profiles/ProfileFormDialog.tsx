import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/zts/FormField";
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
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ProfileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: Profile | null;
}

export function ProfileFormDialog({ open, onOpenChange, profile }: ProfileFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(profile);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setName(profile?.name ?? "");
    setDescription(profile?.description ?? "");
    setToggles(permissionsToToggleState(profile?.permissions));
  }, [open, profile]);

  const save = useMutation({
    mutationFn: async () => {
      const permissions = toggleStateToPermissions(toggles);
      if (permissions.length === 0) throw new Error("Selecione ao menos uma permissão");
      if (isEdit && profile) {
        return api.profiles.update(profile.id, {
          name: profile.isDefault ? undefined : name.trim(),
          description: description.trim() || undefined,
          permissions,
        });
      }
      return api.profiles.create({
        name: name.trim(),
        description: description.trim() || undefined,
        permissions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.profiles });
      toast.success(isEdit ? "Perfil atualizado" : "Perfil criado");
      onOpenChange(false);
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
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setAction = (key: string, on: boolean) =>
    setToggles(prev => ({ ...prev, [key]: on }));

  const setModuleAll = (resource: string, on: boolean) => {
    const mod = PERMISSION_CATALOG.find(m => m.resource === resource);
    if (!mod) return;
    setToggles(prev => {
      const next = { ...prev };
      for (const a of mod.actions) next[permissionKey(resource, a.key)] = on;
      return next;
    });
  };

  const validName = name.trim().length > 0;
  const hasPerms = Object.values(toggles).some(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar perfil" : "Novo perfil"}</DialogTitle>
          <DialogDescription>
            Escolha os módulos e o tipo de permissão. O acesso total (*) não está disponível aqui.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Nome *" htmlFor="pf-name" className="sm:col-span-2">
            <Input
              id="pf-name"
              value={name}
              disabled={profile?.isDefault}
              onChange={e => setName(e.target.value)}
            />
          </FormField>
          <FormField label="Descrição" htmlFor="pf-desc" className="sm:col-span-2">
            <Textarea
              id="pf-desc"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </FormField>
        </div>

        <div className="space-y-3 pt-1">
          <p className="text-xs font-medium text-muted-foreground">Módulos e permissões</p>
          {PERMISSION_CATALOG.map(mod => {
            const keys = mod.actions.map(a => permissionKey(mod.resource, a.key));
            const allOn = keys.every(k => toggles[k]);
            return (
              <div key={mod.resource} className="rounded-md border px-3 py-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{mod.label}</span>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Tudo
                    <Switch checked={allOn} onCheckedChange={v => setModuleAll(mod.resource, v)} />
                  </label>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {mod.actions.map(action => {
                    const key = permissionKey(mod.resource, action.key);
                    return (
                      <label key={key} className="inline-flex items-center gap-2 text-sm">
                        <Switch
                          checked={Boolean(toggles[key])}
                          onCheckedChange={v => setAction(key, v)}
                        />
                        {action.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div>
            {isEdit && profile && !profile.isDefault && (
              <Button
                type="button"
                variant="outline"
                disabled={setActive.isPending || save.isPending}
                onClick={() => setActive.mutate(!profile.isActive)}
              >
                {profile.isActive ? "Desativar" : "Reativar"}
              </Button>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!validName || !hasPerms || save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
