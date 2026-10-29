import { errorMessage, isApiError } from '~/composables/useApi'

export function clubErrorMessage(error: unknown) {
  if (isApiError(error, 'gate_not_met')) return 'Posting is ownership-gated: own this game or one of its items to post.'
  if (isApiError(error, 'account_suspended')) return 'Your account is suspended from posting.'
  if (isApiError(error, 'rate_limited')) return 'You are posting too quickly — wait a few minutes and try again.'
  if (isApiError(error, 'missing_session')) return 'Log in to post.'
  if (isApiError(error, 'validation_failed')) return 'Posts must be between 1 and 4,000 characters.'
  return errorMessage(error)
}
