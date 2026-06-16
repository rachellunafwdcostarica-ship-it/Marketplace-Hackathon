'use client'

import { useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateSystemConfig } from '@/lib/admin/actions'
import type { SystemConfigItem } from '@/lib/admin/queries'

interface SystemConfigFormProps {
  items: SystemConfigItem[]
}

/**
 * Editor de `configuracion_sistema` (solo-admin). Edita los valores en cliente y
 * envía únicamente los cambiados a `updateSystemConfig`, que valida por tipo y el
 * invariante de plazos. Los errores del action se traducen a copy amigable.
 */
export function SystemConfigForm({ items }: SystemConfigFormProps) {
  const t = useTranslations('AdminConfig')
  const locale = useLocale()
  const router = useRouter()

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((item) => [item.clave, item.valor])),
  )
  const [saving, setSaving] = useState(false)

  const setValue = (clave: string, valor: string) => {
    setValues((prev) => ({ ...prev, [clave]: valor }))
  }

  const errorMessage = (code: string): string => {
    switch (code) {
      case 'invalid_integer':
        return t('errorInteger')
      case 'invalid_decimal':
        return t('errorDecimal')
      case 'invalid_boolean':
        return t('errorBoolean')
      case 'empty_string':
        return t('errorEmpty')
      case 'negative_value':
        return t('errorNegative')
      case 'plazo_order':
        return t('errorPlazoOrder')
      case 'forbidden':
      case 'unauthenticated':
        return t('errorForbidden')
      default:
        return t('errorGeneric')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const updates = items
      .filter((item) => (values[item.clave] ?? item.valor) !== item.valor)
      .map((item) => ({
        clave: item.clave,
        valor: values[item.clave] ?? item.valor,
      }))

    if (updates.length === 0) {
      toast.info(t('noChanges'))
      return
    }

    setSaving(true)
    const result = await updateSystemConfig({ updates })
    setSaving(false)

    if (result.ok) {
      toast.success(t('saved'))
      router.refresh()
    } else {
      toast.error(errorMessage(result.error))
    }
  }

  const renderField = (item: SystemConfigItem) => {
    const value = values[item.clave] ?? item.valor

    if (item.tipo_dato === 'boolean') {
      return (
        <Select
          value={value}
          onValueChange={(next) => setValue(item.clave, next)}
        >
          <SelectTrigger id={item.clave} className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">{t('boolTrue')}</SelectItem>
            <SelectItem value="false">{t('boolFalse')}</SelectItem>
          </SelectContent>
        </Select>
      )
    }

    const isNumeric =
      item.tipo_dato === 'integer' || item.tipo_dato === 'decimal'

    return (
      <Input
        id={item.clave}
        value={value}
        type={isNumeric ? 'number' : 'text'}
        min={isNumeric ? 0 : undefined}
        step={item.tipo_dato === 'decimal' ? 'any' : '1'}
        onChange={(event) => setValue(item.clave, event.target.value)}
        className="w-40"
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card/40 backdrop-blur-sm">
        {items.map((item) => (
          <div
            key={item.clave}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <Label
                htmlFor={item.clave}
                className="font-mono text-sm font-semibold text-foreground"
              >
                {item.clave}
              </Label>
              {item.descripcion ? (
                <p className="text-xs text-muted-foreground">
                  {item.descripcion}
                </p>
              ) : null}
              <p className="text-[10px] text-muted-foreground/70">
                {t('lastModified', {
                  date: new Date(item.modificado_at).toLocaleString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }),
                })}
              </p>
            </div>
            <div className="shrink-0">{renderField(item)}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? t('saving') : t('save')}
        </Button>
      </div>
    </form>
  )
}
