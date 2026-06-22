import { test, expect } from '@playwright/test'

test.describe('Modal de Habilidades Técnicas', () => {
  test('debería abrir el modal, cargar habilidades desde Supabase y guardar una habilidad seleccionada', async ({
    page,
  }) => {
    // 1. Navegar a la página de portafolio
    await page.goto('/portfolio')

    // 2. Hacer clic en "Agregar Habilidad"
    // Buscamos el botón que contenga el texto para añadir la habilidad
    const addSkillButton = page
      .locator('button', { hasText: 'Agregar Habilidad' })
      .first()
    await addSkillButton.waitFor({ state: 'visible' })
    await addSkillButton.click()

    // 3. Verificar que el modal se abre
    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible()

    // 4. Verificar que el selector de habilidades (select) está presente
    const skillSelect = modal.locator('select#skill-name')
    await expect(skillSelect).toBeVisible()

    // 5. Verificar que las opciones del select se han cargado desde Supabase
    // Debe haber más de 1 opción (el placeholder "Selecciona una habilidad..." + opciones reales de la BD)
    await expect(async () => {
      const optionsCount = await skillSelect.locator('option').count()
      expect(optionsCount).toBeGreaterThan(1)
    }).toPass({ timeout: 5000 })

    // 6. Seleccionar la primera habilidad de la base de datos (índice 1, ya que el índice 0 es el placeholder)
    await skillSelect.selectOption({ index: 1 })

    // 7. Seleccionar un nivel (por ejemplo 'intermedio') en el select de niveles
    const levelSelect = modal.locator('select#skill-level')
    await expect(levelSelect).toBeVisible()
    await levelSelect.selectOption('intermedio')

    // 8. Hacer clic en "Guardar Habilidad"
    const saveButton = modal.locator('button', { hasText: 'Guardar Habilidad' })
    await expect(saveButton).toBeVisible()
    await saveButton.click()

    // 9. Verificar que el modal se cierra correctamente
    await expect(modal).not.toBeVisible()
  })
})
