export interface PasswordRequirement {
  key: string
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { key: 'length', label: 'Mínimo de 8 caracteres', test: (p) => p.length >= 8 },
  { key: 'lower', label: 'Letras minúsculas', test: (p) => /[a-z]/.test(p) },
  { key: 'upper', label: 'Letras maiúsculas', test: (p) => /[A-Z]/.test(p) },
  { key: 'number', label: 'Números', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'Caracteres especiais', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export function validatePassword(password: string): string[] {
  return PASSWORD_REQUIREMENTS.filter((req) => !req.test(password)).map((req) => req.label)
}

export type PasswordStrengthLabel = 'Muito fraca' | 'Fraca' | 'Razoável' | 'Forte' | 'Muito forte'

export interface PasswordStrength {
  score: number
  total: number
  label: PasswordStrengthLabel
}

const STRENGTH_LABELS: PasswordStrengthLabel[] = ['Muito fraca', 'Fraca', 'Razoável', 'Forte', 'Muito forte']

export function getPasswordStrength(password: string): PasswordStrength {
  const total = PASSWORD_REQUIREMENTS.length
  const score = password.length === 0 ? 0 : PASSWORD_REQUIREMENTS.filter((req) => req.test(password)).length
  const labelIndex = password.length === 0 ? 0 : Math.max(0, score - 1)
  return { score, total, label: STRENGTH_LABELS[labelIndex] }
}
