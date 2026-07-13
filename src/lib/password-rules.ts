export const PASSWORD_REQUIREMENTS = [
  { key: 'lower', label: 'Letras minúsculas', regex: /[a-z]/ },
  { key: 'upper', label: 'Letras maiúsculas', regex: /[A-Z]/ },
  { key: 'number', label: 'Números', regex: /[0-9]/ },
  { key: 'special', label: 'Caracteres especiais', regex: /[^A-Za-z0-9]/ },
] as const

export function validatePassword(password: string): string[] {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('A senha deve ter no mínimo 8 caracteres.')
  }

  for (const req of PASSWORD_REQUIREMENTS) {
    if (!req.regex.test(password)) {
      errors.push(req.label)
    }
  }

  return errors
}
