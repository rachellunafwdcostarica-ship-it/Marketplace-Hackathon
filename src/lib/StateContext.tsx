'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  Project,
  Application,
  Company,
  UserRole,
  ProjectStatus,
  ApplicationStatus,
  CompanyStatus,
} from '@/types'
import {
  mockProjects,
  mockApplications,
  mockCompanies,
} from '@/lib/constants/mockData'
import type { CompanyProfileInput } from '@/lib/company/schemas'

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
}

const StateContext = createContext<StateContextType | undefined>(undefined)

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [userRole, setUserRoleState] = useState<UserRole>('junior')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const localProjects = localStorage.getItem('fwd_projects')
    const localApps = localStorage.getItem('fwd_applications')
    const localCompanies = localStorage.getItem('fwd_companies')
    const localRole = localStorage.getItem('fwd_role')

    const timer = setTimeout(() => {
      if (localProjects) setProjects(JSON.parse(localProjects) as Project[])
      else {
        setProjects(mockProjects)
        localStorage.setItem('fwd_projects', JSON.stringify(mockProjects))
      }

      if (localApps) setApplications(JSON.parse(localApps) as Application[])
      else {
        setApplications(mockApplications)
        localStorage.setItem(
          'fwd_applications',
          JSON.stringify(mockApplications),
        )
      }

      if (localCompanies) setCompanies(JSON.parse(localCompanies) as Company[])
      else {
        setCompanies(mockCompanies)
        localStorage.setItem('fwd_companies', JSON.stringify(mockCompanies))
      }

      if (localRole) setUserRoleState(localRole as UserRole)
      else setUserRoleState('junior')

      setInitialized(true)
    }, 0)

    return () => clearTimeout(timer)
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

  const setUserRole = (role: UserRole) => {
    setUserRoleState(role)
  }

  const addProject = (
    proj: Omit<Project, 'id' | 'createdAt' | 'companyId' | 'companyName'>,
  ) => {
    const newProj: Project = {
      ...proj,
      id: `proj-${Date.now()}`,
      companyId: 'comp-1',
      companyName: 'TechFlow Solutions',
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
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...profile } : c)),
    )
  }

  const resetAll = () => {
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
