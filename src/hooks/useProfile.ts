import { useEffect, useState } from 'react'
import { choreClient } from '@/lib/chore-client'

interface UseProfileResult {
  name: string
  email: string
  loading: boolean
  error: string | null

  savingName: boolean
  nameError: string | null
  updateName: (name: string) => Promise<void>

  changingPassword: boolean
  passwordError: string | null
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

export function useProfile(): UseProfileResult {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const { data: userData, error: userError } = await choreClient.auth.getUser()
      if (userError || !userData.user) {
        setError('Não foi possível carregar os dados do perfil.')
        setLoading(false)
        return
      }

      setEmail(userData.user.email ?? '')

      const { data: profile, error: profileError } = await choreClient
        .from('profiles')
        .select('name')
        .eq('id', userData.user.id)
        .maybeSingle()

      if (profileError) {
        setError('Não foi possível carregar os dados do perfil.')
        setLoading(false)
        return
      }

      setName(profile?.name ?? '')
      setLoading(false)
    }

    load()
  }, [])

  const updateName = async (newName: string) => {
    setSavingName(true)
    setNameError(null)

    const { data: userData } = await choreClient.auth.getUser()
    if (!userData.user) {
      setNameError('Sessão inválida. Faça login novamente.')
      setSavingName(false)
      return
    }

    const { error: updateError } = await choreClient
      .from('profiles')
      .update({ name: newName })
      .eq('id', userData.user.id)

    if (updateError) {
      setNameError('Não foi possível atualizar o nome.')
      setSavingName(false)
      return
    }

    setName(newName)
    setSavingName(false)
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setChangingPassword(true)
    setPasswordError(null)

    const { error: signInError } = await choreClient.auth.signInWithPassword({
      email,
      password: currentPassword,
    })

    if (signInError) {
      setPasswordError('Senha atual incorreta.')
      setChangingPassword(false)
      return
    }

    const { error: updateError } = await choreClient.auth.updateUser({ password: newPassword })

    if (updateError) {
      setPasswordError('Não foi possível alterar a senha.')
      setChangingPassword(false)
      return
    }

    setChangingPassword(false)
  }

  return {
    name,
    email,
    loading,
    error,
    savingName,
    nameError,
    updateName,
    changingPassword,
    passwordError,
    changePassword,
  }
}
