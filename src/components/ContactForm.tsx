import { useState } from 'react';

type Status = { kind: 'idle' | 'sending' | 'ok' | 'err'; message?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm() {
  const [values, setValues] = useState({ name: '', email: '', message: '', company: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const update = (field: keyof typeof values) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  function validate() {
    const next: Record<string, string> = {};
    if (values.name.trim().length < 2) next.name = 'Tell me who you are.';
    if (!EMAIL_RE.test(values.email)) next.email = 'That address does not look right.';
    if (values.message.trim().length < 10) next.message = 'A little more detail, please.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status.kind === 'sending') return;
    if (!validate()) return;

    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) throw new Error(data.error || 'Something went wrong.');

      setStatus({ kind: 'ok', message: "Sent. I'll get back to you." });
      setValues({ name: '', email: '', message: '', company: '' });
    } catch (err) {
      setStatus({
        kind: 'err',
        message: err instanceof Error ? err.message : 'Could not send. Try email instead.',
      });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label className="form-field">
        <span>Name</span>
        <input
          type="text"
          value={values.name}
          onChange={update('name')}
          autoComplete="name"
          aria-invalid={!!errors.name}
        />
        {errors.name && <em className="field-error">{errors.name}</em>}
      </label>

      <label className="form-field">
        <span>Email</span>
        <input
          type="email"
          value={values.email}
          onChange={update('email')}
          autoComplete="email"
          aria-invalid={!!errors.email}
        />
        {errors.email && <em className="field-error">{errors.email}</em>}
      </label>

      <label className="form-field">
        <span>Message</span>
        <textarea value={values.message} onChange={update('message')} aria-invalid={!!errors.message} />
        {errors.message && <em className="field-error">{errors.message}</em>}
      </label>

      {/* Honeypot: bots fill this, humans never see it. */}
      <div className="hp-field" aria-hidden="true">
        <label>
          Company
          <input type="text" tabIndex={-1} autoComplete="off" value={values.company} onChange={update('company')} />
        </label>
      </div>

      <button type="submit" className="btn btn-solid" disabled={status.kind === 'sending'}>
        {status.kind === 'sending' ? 'Sending…' : 'Send message'}
      </button>

      {status.message && (
        <p className={`form-status ${status.kind === 'ok' ? 'ok' : 'err'}`} role="status">
          {status.message}
        </p>
      )}
    </form>
  );
}
