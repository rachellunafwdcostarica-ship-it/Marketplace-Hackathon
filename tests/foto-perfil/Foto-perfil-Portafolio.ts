import { test, expect } from '@playwright/test'

test.describe('Modal de Edición de Foto de Perfil con Cropper', () => {
  test('debería abrir el modal, escoger una foto y mostrar el cropper', async ({
    page,
  }) => {
    // 1. Navegar a portfolio
    await page.goto('/portfolio')

    const profilePicButton = page
      .locator('button.relative.group.rounded-full')
      .first()
    await profilePicButton.waitFor({ state: 'visible' })
    await profilePicButton.click()

    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible()

    const btnAceptar = modal.locator('button', { hasText: 'Aceptar' })
    await expect(btnAceptar).toBeVisible()

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      btnAceptar.click(),
    ])

    expect(fileChooser).toBeTruthy()

    // 2. Establecer una imagen de prueba
    await fileChooser.setFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAANSURBVBhXYzh8+PB/AAffA0nCJ8yFAAAAAElFTkSuQmCC',
        'base64',
      ),
    })

    // 3. Verificar que aparece el modal de Recorte
    // (buscamos el botón 'Recortar y Subir' que es característico)
    const btnRecortar = page.locator('button', { hasText: 'Recortar y Subir' })
    await expect(btnRecortar).toBeVisible()

    const cropperContainer = page.locator('.reactEasyCrop_Container')
    await expect(cropperContainer).toBeVisible()

    // 4. Cancelar para asegurar que cierra bien
    const btnCancelar = page.locator('button', { hasText: 'Cancelar' }).last()
    await btnCancelar.click()
    await expect(btnRecortar).not.toBeVisible()
  })
})
