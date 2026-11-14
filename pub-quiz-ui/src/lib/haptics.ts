/**
 * A short buzz to confirm a tap, for saving a quiz and following an organizer.
 *
 * Android browsers only: iOS Safari has no Vibration API, and desktops have
 * nothing to vibrate, so there it does nothing. It has to run inside the tap
 * handler itself; browsers ignore vibrate() that is not the result of a tap.
 */
export function tapFeedback() {
  try {
    navigator.vibrate?.(15)
  } catch {
    // Some embedded browsers throw instead of ignoring it.
  }
}
