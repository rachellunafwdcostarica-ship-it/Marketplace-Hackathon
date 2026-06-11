export type WorkMode = 'remoto' | 'hibrido' | 'presencial'

export type ProjectStatus = 'draft' | 'active' | 'closed' | 'pending'

export type ApplicationStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'

export type CompanyStatus = 'pending' | 'approved' | 'rejected'

export type CompanyType = 'formal' | 'emprendedor'

export interface Project {
  id: string
  title: string
  companyId: string
  companyName: string
  description: string
  stack: string[]
  duration: string // e.g. "3 semanas", "2 meses"
  budget: number // USD
  mode: WorkMode
  startDate: string // ISO date string
  status: ProjectStatus
  createdAt: string
}

export interface Application {
  id: string
  projectId: string
  projectTitle: string
  companyId: string
  companyName: string
  candidateName: string
  candidateEmail: string
  coverLetter: string
  portfolioUrl: string
  cvUrl: string
  status: ApplicationStatus
  createdAt: string
}

export interface Company {
  id: string
  name: string
  companyType: CompanyType
  sector: string
  cedula: string
  description: string
  logo: string
  status: CompanyStatus
  projectsCount: number
  contactEmail: string
  website: string
  createdAt: string
  isProfileFilled?: boolean | undefined
  userId?: string | undefined
}

export type UserRole = 'junior' | 'empresa' | 'admin'
