const KEY = 'tripunify_pending_invite'

export const getPendingInvite = () => localStorage.getItem(KEY)
export const setPendingInvite = (code) => localStorage.setItem(KEY, code)
export const clearPendingInvite = () => localStorage.removeItem(KEY)
