import { test, expect } from '@playwright/test'

test.describe('Modal Demo del Portafolio', () => {
  test('debería abrir el modal, mostrar el iframe y permitir cerrar y abrir en otra pestaña', async ({
    page,
  }) => {
    // 1. Navegar a la página donde se visualiza el portafolio
    // Ajusta esta ruta a la URL real donde se carga PortfolioManager.tsx
    await page.goto('/portfolio')

    // 2. Hacer clic en el botón de Demo
    // Buscamos el primer botón que tenga el texto "Demo"
    const demoButton = page.locator('button', { hasText: 'Demo' }).first()
    await demoButton.waitFor({ state: 'visible' })
    await demoButton.click()

    // 3. Verificar que el modal se abre y que contiene el iframe con la URL del demo
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible()

    // Verificamos que el iframe tenga un atributo src asignado
    const src = await iframe.getAttribute('src')
    expect(src).toBeTruthy()

    // 4. Verificar el botón verde (Abrir en otra ventana)
    // El botón verde estilo Mac es un enlace con aria-label="Abrir en otra ventana"
    const btnAbrirVentana = modal.locator(
      'a[aria-label="Abrir en otra ventana"]',
    )
    await expect(btnAbrirVentana).toBeVisible()
    await expect(btnAbrirVentana).toHaveAttribute('target', '_blank')
    await expect(btnAbrirVentana).toHaveAttribute('href', src!)

    // 5. Verificar el botón rojo (Cerrar modal)
    // El botón rojo estilo Mac tiene aria-label="Cerrar modal"
    const btnCerrar = modal.locator('button[aria-label="Cerrar modal"]')
    await expect(btnCerrar).toBeVisible()

    // Simulamos el clic en el botón rojo
    await btnCerrar.click()

    // 6. Verificar que el modal se haya cerrado correctamente
    await expect(modal).not.toBeVisible()
  })
})
