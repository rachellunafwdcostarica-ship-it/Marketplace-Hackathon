'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import {
  Project,
  Application,
  Company,
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
import { FWD_STORAGE_KEYS, useAuth } from '@/lib/auth/AuthContext'
import { getCompanyProfile } from '@/lib/company/actions'

interface DemoDataContextType {
  projects: Project[]
  applications: Application[]
  companies: Company[]
  studentSkills: StudentSkill[]
  setStudentSkills: (skills: StudentSkill[]) => void
  studentPortfolio: StudentPortfolio | null
  setStudentPortfolio: (portfolio: StudentPortfolio | null) => void
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
  currentCompany: Company | undefined
}

const DemoDataContext = createContext<DemoDataContextType | undefined>(
  undefined,
)

export function DemoDataProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, userRole } = useAuth()

  const [projects, setProjects] = useState<Project[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [studentSkills, setStudentSkills] = useState<StudentSkill[]>([])
  const [studentPortfolio, setStudentPortfolio] =
    useState<StudentPortfolio | null>(null)
  const [initialized, setInitialized] = useState(false)

  const fetchedProfileForUser = useRef<string | null>(null)

  useEffect(() => {
    const localProjects = localStorage.getItem(FWD_STORAGE_KEYS.PROJECTS)
    const localApps = localStorage.getItem(FWD_STORAGE_KEYS.APPLICATIONS)
    const localCompanies = localStorage.getItem(FWD_STORAGE_KEYS.COMPANIES)
    const localStudentSkills = localStorage.getItem(
      FWD_STORAGE_KEYS.STUDENT_SKILLS,
    )
    const localStudentPortfolio = localStorage.getItem(
      FWD_STORAGE_KEYS.STUDENT_PORTFOLIO,
    )

    const timer = setTimeout(() => {
      try {
        if (localProjects) setProjects(JSON.parse(localProjects) as Project[])
        else {
          setProjects(mockProjects)
          localStorage.setItem(
            FWD_STORAGE_KEYS.PROJECTS,
            JSON.stringify(mockProjects),
          )
        }
      } catch {
        setProjects(mockProjects)
        localStorage.setItem(
          FWD_STORAGE_KEYS.PROJECTS,
          JSON.stringify(mockProjects),
        )
      }

      try {
        if (localApps) setApplications(JSON.parse(localApps) as Application[])
        else {
          setApplications(mockApplications)
          localStorage.setItem(
            FWD_STORAGE_KEYS.APPLICATIONS,
            JSON.stringify(mockApplications),
          )
        }
      } catch {
        setApplications(mockApplications)
        localStorage.setItem(
          FWD_STORAGE_KEYS.APPLICATIONS,
          JSON.stringify(mockApplications),
        )
      }

      try {
        if (localCompanies)
          setCompanies(JSON.parse(localCompanies) as Company[])
        else {
          setCompanies(mockCompanies)
          localStorage.setItem(
            FWD_STORAGE_KEYS.COMPANIES,
            JSON.stringify(mockCompanies),
          )
        }
      } catch {
        setCompanies(mockCompanies)
        localStorage.setItem(
          FWD_STORAGE_KEYS.COMPANIES,
          JSON.stringify(mockCompanies),
        )
      }

      try {
        if (localStudentSkills)
          setStudentSkills(JSON.parse(localStudentSkills) as StudentSkill[])
        else {
          setStudentSkills(mockStudentSkills)
          localStorage.setItem(
            FWD_STORAGE_KEYS.STUDENT_SKILLS,
            JSON.stringify(mockStudentSkills),
          )
        }
      } catch {
        setStudentSkills(mockStudentSkills)
        localStorage.setItem(
          FWD_STORAGE_KEYS.STUDENT_SKILLS,
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
            FWD_STORAGE_KEYS.STUDENT_PORTFOLIO,
            JSON.stringify(mockStudentPortfolio),
          )
        }
      } catch {
        setStudentPortfolio(mockStudentPortfolio)
        localStorage.setItem(
          FWD_STORAGE_KEYS.STUDENT_PORTFOLIO,
          JSON.stringify(mockStudentPortfolio),
        )
      }

      setInitialized(true)
    }, 0)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!initialized) return
    if (userRole !== 'empresario' || !currentUser) return
    if (fetchedProfileForUser.current === currentUser.id) return
    fetchedProfileForUser.current = currentUser.id

    void getCompanyProfile().then((res) => {
      if (!res.ok || !res.data) return
      const dbProf = res.data
      setCompanies((prev) => {
        const exists = prev.some((c) => c.userId === currentUser.id)
        if (exists) {
          return prev.map((c) =>
            c.userId === currentUser.id
              ? {
                  ...c,
                  ...dbProf,
                  cedula: dbProf.cedula ?? '',
                  isProfileFilled: true,
                }
              : c,
          )
        }
        return [
          {
            id: `comp-${currentUser.id}`,
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
            userId: currentUser.id,
          },
          ...prev,
        ]
      })
    })
  }, [initialized, currentUser, userRole])

  useEffect(() => {
    if (!initialized) return
    localStorage.setItem(FWD_STORAGE_KEYS.PROJECTS, JSON.stringify(projects))
  }, [projects, initialized])

  useEffect(() => {
    if (!initialized) return
    localStorage.setItem(
      FWD_STORAGE_KEYS.APPLICATIONS,
      JSON.stringify(applications),
    )
  }, [applications, initialized])

  useEffect(() => {
    if (!initialized) return
    localStorage.setItem(FWD_STORAGE_KEYS.COMPANIES, JSON.stringify(companies))
  }, [companies, initialized])

  useEffect(() => {
    if (!initialized) return
    localStorage.setItem(
      FWD_STORAGE_KEYS.STUDENT_SKILLS,
      JSON.stringify(studentSkills),
    )
  }, [studentSkills, initialized])

  useEffect(() => {
    if (!initialized) return
    localStorage.setItem(
      FWD_STORAGE_KEYS.STUDENT_PORTFOLIO,
      JSON.stringify(studentPortfolio),
    )
  }, [studentPortfolio, initialized])

  const currentCompany = useMemo(() => {
    if (!currentUser) return undefined
    const found = companies.find((c) => c.userId === currentUser.id)
    if (found) return found

    if (userRole === 'empresario') {
      return {
        id: `comp-temp-${currentUser.id}`,
        name:
          (currentUser.user_metadata?.full_name as string | undefined) ?? '',
        companyType: 'formal' as const,
        sector: '',
        cedula: '',
        description: '',
        logo: '',
        status: 'pending' as const,
        projectsCount: 0,
        contactEmail: currentUser.email ?? '',
        website: '',
        createdAt: new Date().toISOString(),
        isProfileFilled: false,
        userId: currentUser.id,
      }
    }
    return undefined
  }, [companies, currentUser, userRole])

  const addProject = (
    proj: Omit<Project, 'id' | 'createdAt' | 'companyId' | 'companyName'>,
  ) => {
    const newProj: Project = {
      ...proj,
      id: `proj-${Date.now()}`,
      companyId: currentCompany?.id ?? 'comp-1',
      companyName: currentCompany?.name ?? 'TechFlow Solutions',
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

  return (
    <DemoDataContext.Provider
      value={{
        projects,
        applications,
        companies,
        studentSkills,
        setStudentSkills,
        studentPortfolio,
        setStudentPortfolio,
        addProject,
        updateProjectStatus,
        addApplication,
        updateApplicationStatus,
        updateCompanyStatus,
        currentCompany,
      }}
    >
      {children}
    </DemoDataContext.Provider>
  )
}

export function useDemoData() {
  const context = useContext(DemoDataContext)
  if (context === undefined) {
    throw new Error('useDemoData must be used within a DemoDataProvider')
  }
  return context
}
