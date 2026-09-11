/**
 * Recognises a visitor asking the desktop pet to leave, without asking the model.
 *
 * The model is told how (`[[PET]] away`), but "make the little guy leave" and
 * "can you disable the pet" still went to the live bot and came back as
 * paragraphs about the shop. For a command this narrow the server can just
 * know. It's instant, costs no tokens, and behaves the same on every model.
 *
 * Deliberately strict, because a false positive does real damage: the
 * visitor's actual message never reaches the model, and they get a canned line
 * about the pet instead of an answer. So the whole message has to be the
 * command and nothing else ("hide the pet", "can you disable the pet", "make
 * the little guy leave"). A second clause, another feature, a negation, or a
 * question about him all fail to match. Those go to the model, which has the
 * directive in its prompt, so missing a phrasing costs very little.
 */

const MAX_CHARS = 60;

/* What he's called, with an optional determiner. Not "him": on this site that
   almost always means Genova. */
const PET =
  '(?:(?:the|that|this|your|ur)\\s+)?' +
  '(?:desktop\\s+pet|pet|(?:little|lil|tiny|small|mini)\\s+(?:guy|man|dude|fella|fellow|genova|person|character)' +
  '|cut-?out|sprite|walking\\s+(?:guy|man|dude))';

/* Politeness either side of the command. */
const LEAD =
  '(?:(?:hey|ok|okay)\\s+)?(?:(?:please|pls|plz)\\s+)?' +
  '(?:(?:can|could|would|will)\\s+(?:you|u)\\s+)?(?:(?:please|pls|plz)\\s+)?';
const TAIL = '(?:\\s+(?:please|pls|plz|now|for\\s+me|thanks|thank\\s+you))*';

const GO_HOME = 'go(?:\\s+away|\\s+home)?';

const FORMS = [
  /* disable the pet, get rid of the little guy */
  '(?:disable|hide|remove|dismiss|banish|shoo|stop|close|get\\s+rid\\s+of' +
    '|turn\\s+off|switch\\s+off|shut\\s+off|put\\s+away|send\\s+away)\\s+' + PET,
  /* turn the pet off, send the little guy home */
  '(?:turn|switch|shut)\\s+' + PET + '\\s+off',
  '(?:put|send)\\s+' + PET + '\\s+(?:away|home|back)',
  /* make the little guy leave, tell the pet to go away */
  '(?:make|have|let)\\s+' + PET + '\\s+(?:leave|disappear|' + GO_HOME + ')',
  'tell\\s+' + PET + '\\s+to\\s+(?:leave|' + GO_HOME + ')',
  /* can the little guy leave, little guy go away, bye little guy */
  '(?:can|could)\\s+' + PET + '\\s+(?:leave|' + GO_HOME + ')',
  PET + '\\s+(?:leave|go\\s+away|go\\s+home)',
  '(?:bye|goodbye|go\\s+away|shoo)\\s+' + PET,
];

const COMMAND = new RegExp('^' + LEAD + '(?:' + FORMS.join('|') + ')' + TAIL + '$', 'i');

/** True when the whole of `text` is a request to send the desktop pet away. */
export function asksPetToLeave(text) {
  const t = String(text ?? '')
    .trim()
    .replace(/[\s.!?]+$/, '')
    .replace(/\s+/g, ' ');
  if (!t || t.length > MAX_CHARS) return false;
  return COMMAND.test(t);
}
