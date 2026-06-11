'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from 'react'
import {
  Project,
  Application,
  Company,
  UserRole,
  ProjectStatus,
  ApplicationStatus,
  CompanyStatus,
  CompanyType,
} from '@/types'
import {
  mockProjects,
  mockApplications,
  mockCompanies,
} from '@/lib/constants/mockData'
import type { CompanyProfileInput } from '@/lib/company/schemas'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { normalizeRole } from '@/lib/auth/roles'

import type { User } from '@supabase/supabase-js'

interface StateContextType {
  projects: Project[]
  applications: Application[]
  companies: Company[]
  userRole: UserRole
  setUserRole: (role: UserRole) => void
  addProject: (
    project: Omit<Project, 'id' | 'createdAt' | 'companyId' | 'companyName'>,
  ) => void
  updateProjectStatus: (id: string, status: ProjectStatus) => void
  addApplication: (
    application: Omit<
      Application,
      'id' | 'createdAt' | 'status' | 'candidateName' | 'candidateEmail'
    >,
  ) => void
  updateApplicationStatus: (id: string, status: ApplicationStatus) => void
  updateCompanyStatus: (id: string, status: CompanyStatus) => void
  updateCompany: (id: string, profile: CompanyProfileInput) => void
  resetAll: () => void
  currentCompany: Company | undefined
  currentUser: User | null
}

const StateContext = createContext<StateContextType | undefined>(undefined)

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [userRole, setUserRoleState] = useState<UserRole>('junior')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const localProjects = localStorage.getItem('fwd_projects')
    const localApps = localStorage.getItem('fwd_applications')
    const localCompanies = localStorage.getItem('fwd_companies')
    const localRole = localStorage.getItem('fwd_role')

    const timer = setTimeout(() => {
      try {
        if (localProjects) setProjects(JSON.parse(localProjects) as Project[])
        else {
          setProjects(mockProjects)
          localStorage.setItem('fwd_projects', JSON.stringify(mockProjects))
        }
      } catch {
        setProjects(mockProjects)
        localStorage.setItem('fwd_projects', JSON.stringify(mockProjects))
      }

      try {
        if (localApps) setApplications(JSON.parse(localApps) as Application[])
        else {
          setApplications(mockApplications)
          localStorage.setItem(
            'fwd_applications',
            JSON.stringify(mockApplications),
          )
        }
      } catch {
        setApplications(mockApplications)
        localStorage.setItem(
          'fwd_applications',
          JSON.stringify(mockApplications),
        )
      }

      try {
        if (localCompanies)
          setCompanies(JSON.parse(localCompanies) as Company[])
        else {
          setCompanies(mockCompanies)
          localStorage.setItem('fwd_companies', JSON.stringify(mockCompanies))
        }
      } catch {
        setCompanies(mockCompanies)
        localStorage.setItem('fwd_companies', JSON.stringify(mockCompanies))
      }

      if (localRole) setUserRoleState(localRole as UserRole)
      else setUserRoleState('junior')

      setInitialized(true)
    }, 0)

    // Suscribirse al estado de autenticación de Supabase
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setCurrentUser(user)
        const { data: roleRaw } = await supabase.rpc('get_my_role')
        const role = normalizeRole(roleRaw as string | null)
        if (role) {
          setUserRoleState(role)
        }
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null
      setCurrentUser(user)
      if (user) {
        const { data: roleRaw } = await supabase.rpc('get_my_role')
        const role = normalizeRole(roleRaw as string | null)
        if (role) {
          setUserRoleState(role)
        }
      }
    })

    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!initialized) return
    localStorage.setItem('fwd_projects', JSON.stringify(projects))
  }, [projects, initialized])

  useEffect(() => {
    if (!initialized) return
    localStorage.setItem('fwd_applications', JSON.stringify(applications))
  }, [applications, initialized])

  useEffect(() => {
    if (!initialized) return
    localStorage.setItem('fwd_companies', JSON.stringify(companies))
  }, [companies, initialized])

  useEffect(() => {
    if (!initialized) return
    localStorage.setItem('fwd_role', userRole)
    if (typeof window !== 'undefined') {
      document.cookie = `fwd_role=${userRole}; path=/; max-age=31536000; SameSite=Lax`
    }
  }, [userRole, initialized])

  const currentCompany = useMemo(() => {
    if (!currentUser) return undefined
    const found = companies.find((c) => c.userId === currentUser.id)
    if (found) return found

    if (userRole === 'empresa') {
      return {
        id: `comp-temp-${currentUser.id}`,
        name: currentUser.user_metadata?.full_name || '',
        companyType: 'formal' as const,
        sector: '',
        cedula: '',
        description: '',
        logo: '',
        status: 'pending' as const,
        projectsCount: 0,
        contactEmail: currentUser.email || '',
        website: '',
        createdAt: new Date().toISOString(),
        isProfileFilled: false,
        userId: currentUser.id,
      }
    }
    return undefined
  }, [companies, currentUser, userRole])

  const setUserRole = (role: UserRole) => {
    setUserRoleState(role)
  }

  const addProject = (
    proj: Omit<Project, 'id' | 'createdAt' | 'companyId' | 'companyName'>,
  ) => {
    const newProj: Project = {
      ...proj,
      id: `proj-${Date.now()}`,
      companyId: currentCompany?.id || 'comp-1',
      companyName: currentCompany?.name || 'TechFlow Solutions',
      createdAt: new Date().toISOString(),
    }
    setProjects((prev) => [newProj, ...prev])
  }

  const updateProjectStatus = (id: string, status: ProjectStatus) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
  }

  const addApplication = (
    app: Omit<
      Application,
      'id' | 'createdAt' | 'status' | 'candidateName' | 'candidateEmail'
    >,
  ) => {
    const newApp: Application = {
      ...app,
      id: `app-${Date.now()}`,
      candidateName: 'Juan Pérez',
      candidateEmail: 'juan.perez@fwd.edu',
      status: 'sent',
      createdAt: new Date().toISOString(),
    }
    setApplications((prev) => [newApp, ...prev])
  }

  const updateApplicationStatus = (id: string, status: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a)),
    )
  }

  const updateCompanyStatus = (id: string, status: CompanyStatus) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c)),
    )
  }

  const updateCompany = (id: string, profile: CompanyProfileInput) => {
    setCompanies((prev) => {
      const exists = prev.some(
        (c) => c.id === id || (currentUser && c.userId === currentUser.id),
      )
      if (exists) {
        return prev.map((c) => {
          if (c.id === id || (currentUser && c.userId === currentUser.id)) {
            return {
              ...c,
              ...profile,
              id: id.startsWith('comp-temp-') ? `comp-${Date.now()}` : c.id,
              isProfileFilled: true,
              userId: currentUser?.id,
            }
          }
          return c
        })
      } else {
        const newCompany: Company = {
          id: `comp-${Date.now()}`,
          name: profile.name,
          companyType: profile.companyType as CompanyType,
          sector: profile.sector,
          cedula: profile.cedula,
          description: profile.description || '',
          logo: profile.logo || '',
          status: 'approved',
          projectsCount: 0,
          contactEmail: profile.contactEmail,
          website: profile.website || '',
          createdAt: new Date().toISOString(),
          isProfileFilled: true,
          userId: currentUser?.id,
        }
        return [newCompany, ...prev]
      }
    })
  }

  const resetAll = () => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.signOut().then(() => {
      localStorage.removeItem('fwd_projects')
      localStorage.removeItem('fwd_applications')
      localStorage.removeItem('fwd_companies')
      localStorage.removeItem('fwd_role')
      if (typeof window !== 'undefined') {
        document.cookie =
          'fwd_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
      setProjects(mockProjects)
      setApplications(mockApplications)
      setCompanies(mockCompanies)
      setUserRoleState('junior')
      setCurrentUser(null)
    })
  }

  return (
    <StateContext.Provider
      value={{
        projects,
        applications,
        companies,
        userRole,
        setUserRole,
        addProject,
        updateProjectStatus,
        addApplication,
        updateApplicationStatus,
        updateCompanyStatus,
        updateCompany,
        resetAll,
        currentCompany,
        currentUser,
      }}
    >
      {children}
    </StateContext.Provider>
  )
}

export function useAppState() {
  const context = useContext(StateContext)
  if (context === undefined) {
    throw new Error('useAppState must be used within a StateProvider')
  }
  return context
}
