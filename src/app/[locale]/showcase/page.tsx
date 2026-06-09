'use client'

// Pagina de showcase (dev). Renderiza los componentes rescatados con datos de
// ejemplo para validar visualmente los tokens FWD. No es una pantalla de producto.

import { useState } from 'react'
import {
  Briefcase,
  Users,
  FolderKanban,
  Sparkles,
  Target,
  Rocket,
  Inbox,
} from 'lucide-react'
import type { Application, Company, Project } from '@/types'

import { PageTitle } from '@/components/features/PageTitle'
import { DashboardStats } from '@/components/features/DashboardStats'
import { InsightSection } from '@/components/features/InsightSection'
import { LoadingSkeleton } from '@/components/features/LoadingSkeleton'
import { EmptyState } from '@/components/features/EmptyState'
import { SearchBar } from '@/components/features/SearchBar'
import { StatusPill } from '@/components/features/StatusPill'
import { ProjectCard } from '@/components/features/marketplace/ProjectCard'
import { ProjectFilters } from '@/components/features/marketplace/ProjectFilters'
import { ApplicationCard } from '@/components/features/applications/ApplicationCard'
import { CompanyCard } from '@/components/features/companies/CompanyCard'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ApplicationStatus } from '@/types'

const logoDataUri =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" rx="8" fill="%230A6CB9"/></svg>'

const sampleProject: Project = {
  id: '1',
  title: 'Landing page para una fintech',
  companyId: 'c1',
  companyName: 'Acme Capital',
  description:
    'Construir una landing en Next.js con animaciones suaves, formulario de captura y buen rendimiento en mobile.',
  stack: ['Next.js', 'TypeScript', 'Tailwind'],
  duration: '3 semanas',
  budget: 650,
  mode: 'remoto',
  startDate: '2026-07-01',
  status: 'active',
  createdAt: '2026-06-01',
}

const sampleApplication: Application = {
  id: 'a1',
  projectId: '1',
  projectTitle: 'Landing page para una fintech',
  companyId: 'c1',
  companyName: 'Acme Capital',
  candidateName: 'María Soto',
  candidateEmail: 'maria@example.com',
  coverLetter:
    'Me entusiasma este proyecto porque ya trabajé en landings de alto rendimiento y me gusta cuidar el detalle visual.',
  portfolioUrl: 'https://example.com',
  cvUrl: 'https://example.com/cv.pdf',
  status: 'sent',
  createdAt: '2026-06-02',
}

const sampleCompany: Company = {
  id: 'c1',
  name: 'Acme Capital',
  description:
    'Fintech de pagos para pequeñas y medianas empresas en Centroamérica.',
  logo: logoDataUri,
  status: 'pending',
  projectsCount: 4,
  contactEmail: 'hola@acme.com',
  website: 'https://acme.com',
  createdAt: '2026-06-01',
}

const allStatuses: ApplicationStatus[] = [
  'draft',
  'sent',
  'viewed',
  'accepted',
  'rejected',
]

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">
        {title}
        <span className="text-accent">.</span>
      </h2>
      {children}
    </section>
  )
}

export default function ShowcasePage() {
  const [search, setSearch] = useState('')
  const [stack, setStack] = useState('')
  const [mode, setMode] = useState('')
  const [duration, setDuration] = useState('')
  const [budget, setBudget] = useState('')
  const [single, setSingle] = useState('')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <PageTitle
        title="Showcase de componentes FWD"
        description="Vista de desarrollo para validar los componentes rescatados y los tokens de identidad FWD."
        action={<Button>Acción principal</Button>}
      />

      <Section title="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="magenta">Magenta</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="highlight">Highlight</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="icono">
            <Sparkles />
          </Button>
        </div>
      </Section>

      <Section title="Badges y estados">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {allStatuses.map((s) => (
            <StatusPill key={s} status={s} />
          ))}
        </div>
      </Section>

      <Section title="Formularios">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
          <div className="space-y-1.5">
            <Label htmlFor="demo-input">Nombre</Label>
            <Input id="demo-input" placeholder="Escribe tu nombre" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-select">Modalidad</Label>
            <Select value={single} onValueChange={setSingle}>
              <SelectTrigger id="demo-select" className="w-full">
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remoto">Remoto</SelectItem>
                <SelectItem value="hibrido">Híbrido</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="demo-textarea">Mensaje</Label>
            <Textarea
              id="demo-textarea"
              placeholder="Cuéntanos sobre el proyecto"
            />
          </div>
        </div>
        <SearchBar value={search} onChange={setSearch} className="max-w-md" />
      </Section>

      <Section title="Filtros de proyectos">
        <ProjectFilters
          selectedStack={stack}
          setSelectedStack={setStack}
          selectedMode={mode}
          setSelectedMode={setMode}
          selectedDuration={duration}
          setSelectedDuration={setDuration}
          selectedBudget={budget}
          setSelectedBudget={setBudget}
          availableStacks={['Next.js', 'React', 'Node', 'Python']}
          onClear={() => {
            setStack('')
            setMode('')
            setDuration('')
            setBudget('')
          }}
        />
      </Section>

      <Section title="Tarjetas">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ProjectCard project={sampleProject} />
          <CompanyCard
            company={sampleCompany}
            onApprove={() => {}}
            onReject={() => {}}
          />
          <ApplicationCard
            application={sampleApplication}
            viewMode="empresa"
            onAccept={() => {}}
            onReject={() => {}}
            onContact={() => {}}
          />
        </div>
      </Section>

      <Section title="Dashboard y estadísticas">
        <DashboardStats
          stats={[
            {
              title: 'Proyectos activos',
              value: 12,
              icon: Briefcase,
              colorClass: 'text-primary',
            },
            {
              title: 'Postulaciones',
              value: 48,
              icon: Users,
              colorClass: 'text-accent',
            },
            {
              title: 'Empresas',
              value: 7,
              icon: FolderKanban,
              colorClass: 'text-secondary',
            },
          ]}
        />
      </Section>

      <Section title="Insights">
        <InsightSection
          title="Consejos para destacar"
          insights={[
            {
              title: 'Portafolio claro',
              description: 'Muestra 2-3 proyectos reales con resultados.',
              icon: Target,
            },
            {
              title: 'Aplica rápido',
              description: 'Las primeras postulaciones tienen más visibilidad.',
              icon: Rocket,
            },
          ]}
        />
      </Section>

      <Section title="Diálogo">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Abrir diálogo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar acción</DialogTitle>
              <DialogDescription>
                Este es un diálogo de ejemplo usando los tokens FWD.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section title="Tabla">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proyecto</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Landing fintech</TableCell>
              <TableCell>Acme Capital</TableCell>
              <TableCell>
                <StatusPill status="sent" />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>App de delivery</TableCell>
              <TableCell>Foodly</TableCell>
              <TableCell>
                <StatusPill status="accepted" />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title="Carga (skeleton)">
        <LoadingSkeleton type="stats" count={3} />
      </Section>

      <Section title="Estado vacío">
        <EmptyState
          title="Sin proyectos todavía"
          description="Cuando publiques o guardes proyectos, aparecerán aquí."
          icon={Inbox}
          actionText="Explorar proyectos"
          onAction={() => {}}
        />
      </Section>
    </div>
  )
}
