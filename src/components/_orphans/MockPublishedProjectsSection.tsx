'use client'

/**
 * HUÉRFANO / CÓDIGO MUERTO — preservado a pedido del equipo.
 *
 * Era la sección "Mis proyectos publicados" del dashboard del empresario cuando
 * usaba datos MOCK de `StateContext`. Se reemplazó por `PublishedProjectsBoard`
 * (datos reales de la BD). NO se importa en ningún lado: queda solo de referencia
 * para quien lo escribió. Ver `docs/deuda-tecnica-mocks.md`. Borrar cuando ya no
 * se necesite. (git también conserva la versión original; esto es un atajo visual.)
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Briefcase, PowerOff } from 'lucide-react'
import { useAppState } from '@/lib/StateContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/features/shared/EmptyState'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function MockPublishedProjectsSection() {
  const tEmpresa = useTranslations('Empresa')
  const tCommon = useTranslations('Common')
  const {
    projects,
    updateProjectStatus,
    currentCompany: company,
  } = useAppState()

  const myProjects = projects.filter(
    (p) => p.companyId === (company?.id || 'comp-1'),
  )

  const [confirm, setConfirm] = useState<{
    isOpen: boolean
    id: string
    title: string
  }>({ isOpen: false, id: '', title: '' })

  const onClose = () => {
    updateProjectStatus(confirm.id, 'closed')
    toast.success(tEmpresa('closeProjectSuccess'))
    setConfirm((p) => ({ ...p, isOpen: false }))
  }

  return (
    <div className="space-y-6">
      {myProjects.length === 0 ? (
        <EmptyState
          title={tEmpresa('noProjects')}
          description={tEmpresa('noProjectsDesc')}
          icon={Briefcase}
        />
      ) : (
        <div className="space-y-4">
          {myProjects.map((project) => (
            <Card
              key={project.id}
              className="border border-border/80 bg-card/40 backdrop-blur-sm overflow-hidden"
            >
              <CardContent className="p-5 flex justify-between items-start gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-base truncate leading-snug">
                      {project.title}
                    </h4>
                    <Badge
                      variant={
                        project.status === 'active' ? 'default' : 'secondary'
                      }
                      className={`text-[10px] font-semibold px-2 rounded-full ${
                        project.status === 'active'
                          ? 'bg-accent/10 text-accent border border-accent/20'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {project.status === 'active'
                        ? tCommon('statusActive')
                        : tCommon('statusClosed')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tCommon('budget')}:{' '}
                    <span className="font-bold text-foreground">
                      ${project.budget} USD
                    </span>{' '}
                    • {tCommon('duration')}:{' '}
                    <span className="font-semibold text-foreground">
                      {project.duration}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {project.stack.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="text-[10px] bg-secondary/5 text-secondary border border-border px-1.5 rounded"
                      >
                        {s}
                      </span>
                    ))}
                    {project.stack.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        + {project.stack.length - 3}
                      </span>
                    )}
                  </div>
                </div>
                {project.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setConfirm({
                        isOpen: true,
                        id: project.id,
                        title: project.title,
                      })
                    }
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                    title="Cerrar Proyecto"
                  >
                    <PowerOff className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={confirm.isOpen}
        onOpenChange={(isOpen) => setConfirm((p) => ({ ...p, isOpen }))}
      >
        <DialogContent className="sm:max-w-md border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading">
              {tEmpresa('confirmCloseProject')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              {tEmpresa('confirmActionOn')} &ldquo;{confirm.title}&rdquo;.{' '}
              {tEmpresa('confirmCannotUndo')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-center pt-4 border-t border-border/40 mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirm((p) => ({ ...p, isOpen: false }))}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={onClose}
              className="bg-warning hover:bg-warning/90 text-primary-foreground font-semibold"
            >
              {tCommon('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
