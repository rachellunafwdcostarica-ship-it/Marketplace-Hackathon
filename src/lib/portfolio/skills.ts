import type { StudentSkill } from '@/types'

export function addOrUpdateSkill(
  skills: StudentSkill[],
  skill: StudentSkill,
): StudentSkill[] {
  const exists = skills.some((s) => s.id === skill.id)
  if (exists) {
    return skills.map((s) => (s.id === skill.id ? skill : s))
  }
  return [...skills, skill]
}

export function deleteSkill(
  skills: StudentSkill[],
  id: string,
): StudentSkill[] {
  return skills.filter((s) => s.id !== id)
}
