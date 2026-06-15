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
  StudentSkill,
  StudentPortfolio,
} from '@/types'
import {
  mockProjects,
  mockApplications,
  mockCompanies,
  mockStudentSkills,
  mockStudentPortfolio,
} from '@/lib/constants/mockData'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { normalizeRole } from '@/lib/auth/roles'
import { getCompanyProfile } from '@/lib/company/actions'

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
  resetAll: () => void
  currentCompany: Company | undefined
  currentUser: User | null
  studentSkills: StudentSkill[]
  setStudentSkills: (skills: StudentSkill[]) => void
  studentPortfolio: StudentPortfolio | null
  setStudentPortfolio: (portfolio: StudentPortfolio | null) => void
}

const StateContext = createContext<StateContextType | undefined>(undefined)

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [studentSkills, setStudentSkills] = useState<StudentSkill[]>([])
  const [studentPortfolio, setStudentPortfolio] =
    useState<StudentPortfolio | null>(null)
  const [userRole, setUserRoleState] = useState<UserRole>('egresado')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const localProjects = localStorage.getItem('fwd_projects')
    const localApps = localStorage.getItem('fwd_applications')
    const localCompanies = localStorage.getItem('fwd_companies')
    const localStudentSkills = localStorage.getItem('fwd_student_skills')
    const localStudentPortfolio = localStorage.getItem('fwd_student_portfolio')
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

      try {
        if (localStudentSkills)
          setStudentSkills(JSON.parse(localStudentSkills) as StudentSkill[])
        else {
          setStudentSkills(mockStudentSkills)
          localStorage.setItem(
            'fwd_student_skills',
            JSON.stringify(mockStudentSkills),
          )
        }
      } catch {
        setStudentSkills(mockStudentSkills)
        localStorage.setItem(
          'fwd_student_skills',
          JSON.stringify(mockStudentSkills),
        )
      }

      try {
        if (localStudentPortfolio)
          setStudentPortfolio(
            JSON.parse(localStudentPortfolio) as StudentPortfolio,
          )
        else {
          setStudentPortfolio(mockStudentPortfolio)
          localStorage.setItem(
            'fwd_student_portfolio',
            JSON.stringify(mockStudentPortfolio),
          )
        }
      } catch {
        setStudentPortfolio(mockStudentPortfolio)
        localStorage.setItem(
          'fwd_student_portfolio',
          JSON.stringify(mockStudentPortfolio),
        )
      }

      if (localRole) setUserRoleState(localRole as UserRole)
      else setUserRoleState('egresado')

      setInitialized(true)
    }, 0)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  // Suscribirse al estado de autenticación y sincronizar datos de Supabase tras inicialización local
  useEffect(() => {
    if (!initialized) return

    const supabase = createSupabaseBrowserClient()

    const fetchCompanyAndRole = async (user: User) => {
      setCurrentUser(user)
      const { data: roleRaw } = await supabase.rpc('get_my_role')
      const role = normalizeRole(roleRaw)
      if (role) {
        setUserRoleState(role)
        if (role === 'empresario') {
          const res = await getCompanyProfile()
          if (res.ok && res.data) {
            const dbProf = res.data
            setCompanies((prev) => {
              const exists = prev.some((c) => c.userId === user.id)
              if (exists) {
                return prev.map((c) =>
                  c.userId === user.id
                    ? {
                        ...c,
                        ...dbProf,
                        cedula: dbProf.cedula ?? '',
                        isProfileFilled: true,
                      }
                    : c,
                )
              } else {
                return [
                  {
                    id: `comp-${Date.now()}`,
                    name: dbProf.name,
                    companyType: dbProf.companyType as CompanyType,
                    sector: dbProf.sector,
                    cedula: dbProf.cedula ?? '',
                    description: dbProf.description,
                    logo: dbProf.logo,
                    status: 'approved' as const,
                    projectsCount: 0,
                    contactEmail: dbProf.contactEmail,
                    website: dbProf.website,
                    createdAt: new Date().toISOString(),
                    isProfileFilled: true,
                    userId: user.id,
                  },
                  ...prev,
                ]
              }
            })
          }
        }
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null
      setCurrentUser(user)
      if (user) {
        await fetchCompanyAndRole(user)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [initialized])

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
    localStorage.setItem('fwd_student_skills', JSON.stringify(studentSkills))
  }, [studentSkills, initialized])

  useEffect(() => {
    if (!initialized) return
    localStorage.setItem(
      'fwd_student_portfolio',
      JSON.stringify(studentPortfolio),
    )
  }, [studentPortfolio, initialized])

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

    if (userRole === 'empresario') {
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

  const resetAll = () => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.signOut().then(() => {
      localStorage.removeItem('fwd_projects')
      localStorage.removeItem('fwd_applications')
      localStorage.removeItem('fwd_companies')
      localStorage.removeItem('fwd_student_skills')
      localStorage.removeItem('fwd_student_portfolio')
      localStorage.removeItem('fwd_role')
      if (typeof window !== 'undefined') {
        document.cookie =
          'fwd_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
      setProjects(mockProjects)
      setApplications(mockApplications)
      setCompanies(mockCompanies)
      setStudentSkills(mockStudentSkills)
      setStudentPortfolio(mockStudentPortfolio)
      setUserRoleState('egresado')
      setCurrentUser(null)
    })
  }

  return (
    <StateContext.Provider
      value={{
        projects,
        applications,
        companies,
        studentSkills,
        setStudentSkills,
        studentPortfolio,
        setStudentPortfolio,
        userRole,
        setUserRole,
        addProject,
        updateProjectStatus,
        addApplication,
        updateApplicationStatus,
        updateCompanyStatus,
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
