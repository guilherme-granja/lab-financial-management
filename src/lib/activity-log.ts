import { choreClient } from './chore-client'

export async function logActivity(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await choreClient.from('activity_log').insert({ user_id: userId, action, metadata })
  } catch {
    // best-effort: log nunca pode quebrar a ação real do usuário
  }
}
