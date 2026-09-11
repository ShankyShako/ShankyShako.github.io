/**
 * The plain ways visitors ask the chat to get rid of the desktop pet. The
 * server answers these itself, so they work whatever the model does.
 *
 * Only a message that is nothing but the command matches. A longer message that
 * happens to mention him goes to the model as usual, so the visitor's real
 * question never gets swapped for a canned reply.
 */
const PET = '(?:the\\s+)?(?:pet|little\\s+guy)';

const COMMAND = new RegExp(
  '^(?:(?:please|can\\s+you|could\\s+you)\\s+)?' +
    '(?:(?:hide|disable|remove|turn\\s+off|get\\s+rid\\s+of)\\s+' + PET +
    '|make\\s+' + PET + '\\s+(?:leave|go\\s+away))' +
    '(?:\\s+please)?$',
  'i',
);

export function asksPetToLeave(text) {
  return COMMAND.test(String(text ?? '').trim().replace(/[\s.!?]+$/, ''));
}
