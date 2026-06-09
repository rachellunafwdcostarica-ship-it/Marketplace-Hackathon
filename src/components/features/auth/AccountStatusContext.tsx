'use client'

import React, { createContext, useContext } from 'react'

interface AccountStatusContextValue {
  estadoCuenta: string | null
  isPending: boolean
}

const AccountStatusContext = createContext<AccountStatusContextValue>({
  estadoCuenta: null,
  isPending: true, // conservador: pendiente por defecto
})

export function AccountStatusProvider({
  estadoCuenta,
  children,
}: {
  estadoCuenta: string | null
  children: React.ReactNode
}) {
  return (
    <AccountStatusContext.Provider
      value={{ estadoCuenta, isPending: estadoCuenta !== 'activa' }}
    >
      {children}
    </AccountStatusContext.Provider>
  )
}

export function useAccountStatus(): AccountStatusContextValue {
  return useContext(AccountStatusContext)
}
