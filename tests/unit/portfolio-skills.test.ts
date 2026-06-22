import { describe, it, expect } from 'vitest'
import { addOrUpdateSkill, deleteSkill } from '@/lib/portfolio/skills'
import type { StudentSkill } from '@/types'

describe('Portfolio Skills Helper Functions', () => {
  const mockSkills: StudentSkill[] = [
    { id: '1', name: 'React', level: 'avanzado' },
    { id: '2', name: 'TypeScript', level: 'intermedio' },
  ]

  describe('addOrUpdateSkill', () => {
    it('should add a new skill if it does not exist', () => {
      const newSkill: StudentSkill = {
        id: '3',
        name: 'Node.js',
        level: 'basico',
      }
      const result = addOrUpdateSkill(mockSkills, newSkill)

      expect(result).toHaveLength(3)
      expect(result).toContainEqual(newSkill)
      // Original list should not be mutated
      expect(mockSkills).toHaveLength(2)
    })

    it('should update an existing skill level and name', () => {
      const updatedSkill: StudentSkill = {
        id: '2',
        name: 'TypeScript',
        level: 'avanzado',
      }
      const result = addOrUpdateSkill(mockSkills, updatedSkill)

      expect(result).toHaveLength(2)
      expect(result[1]).toEqual(updatedSkill)
      // Original list should not be mutated
      expect(mockSkills[1]?.level).toBe('intermedio')
    })
  })

  describe('deleteSkill', () => {
    it('should delete a skill by id', () => {
      const result = deleteSkill(mockSkills, '1')

      expect(result).toHaveLength(1)
      expect(result.some((s: StudentSkill) => s.id === '1')).toBe(false)
      // Original list should not be mutated
      expect(mockSkills).toHaveLength(2)
    })

    it('should return the same list if id is not found', () => {
      const result = deleteSkill(mockSkills, 'non-existent')

      expect(result).toHaveLength(2)
      expect(result).toEqual(mockSkills)
    })
  })
})
