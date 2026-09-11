/**
 * The one line between the chat bot and the desktop pet.
 *
 * They are siblings in App with nothing shared above them, and a context
 * provider for one command and one flag would be more ceremony than either
 * side needs. The chat sends him away and reads whether he is out, so the bot
 * isn't offering to dismiss a pet that is already in his bag.
 */
export type PetPresence = 'out' | 'away';

let presence: PetPresence = 'away';
const listeners = new Set<() => void>();

/** Whether he is out on the page right now. Read at send time, not subscribed. */
export const petPresence = () => presence;

export function setPetPresence(next: PetPresence) {
  presence = next;
}

/** Ask him to leave. What happens depends on what he is doing; see requestLeave. */
export function sendPetAway() {
  listeners.forEach((fn) => fn());
}

export function onPetAway(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
