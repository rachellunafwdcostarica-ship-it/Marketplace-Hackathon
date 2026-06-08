'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { toast } from 'sonner'
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface LoginFormValues {
  email: string
}

function createLoginSchema(
  t: ReturnType<typeof useTranslations<'Validation'>>,
) {
  return zod.object({
    email: zod.string().email({ message: t('emailInvalid') }),
  })
}

export default function LoginPage() {
  const tLogin = useTranslations('Login')
  const tValidation = useTranslations('Validation')

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const loginSchema = useMemo(
    () => createLoginSchema(tValidation),
    [tValidation],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setSuccess(true)
    toast.success(tLogin('success'))
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
    }
    // Si no hay error, el browser redirige a Google — no hace falta setLoading(false)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight font-heading text-foreground">
              {tLogin('title')}
              <span className="text-primary">.</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {tLogin('subtitle')}
            </p>
          </div>

          <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-secondary to-accent" />

            {success ? (
              <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-accent/15 text-accent">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  {tLogin('success')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {tLogin('redirecting')}
                </p>
              </CardContent>
            ) : (
              <>
                <CardHeader className="pb-4 pt-6">
                  <CardTitle className="text-base font-bold text-center">
                    {tLogin('magicLink')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-4">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-semibold">
                        {tLogin('emailLabel')}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={tLogin('emailPlaceholder')}
                          className={`pl-9 bg-card/50 border-border ${errors.email ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                          {...register('email')}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-xs font-semibold text-destructive">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary hover:bg-primary/95 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                    >
                      {loading ? tLogin('sending') : tLogin('sendLink')}
                      {!loading && <ArrowRight className="w-4 h-4" />}
                    </Button>
                  </form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/60" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground">
                        {tLogin('orContinueWith')}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full border-border hover:bg-muted font-semibold text-sm"
                  >
                    {tLogin('google')}
                  </Button>
                </CardContent>

                <CardFooter className="px-6 pb-6 pt-0">
                  <p className="text-xs text-muted-foreground text-center w-full">
                    {tLogin('noAccount')}{' '}
                    <span className="text-primary font-semibold">
                      {tLogin('signUpViaGoogle')}
                    </span>
                  </p>
                </CardFooter>
              </>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
