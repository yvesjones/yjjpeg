"use client";

import { Send } from "lucide-react";
import * as React from "react";

type Status = "idle" | "loading" | "success" | "error";

const fieldClass =
  "mono hairline w-full rounded-xl border bg-surface px-4 py-3 text-foreground transition-colors placeholder:text-muted/50 focus:border-accent focus:outline-none";

export default function ContactForm() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [type, setType] = React.useState("prints");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const [errorMessage, setErrorMessage] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, type, subject, message }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Something went wrong.");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/15">
          <Send size={24} className="text-accent" />
        </div>
        <h3 className="display display-md">Message sent</h3>
        <p className="mt-2 text-muted">I&rsquo;ll get back to you as soon as I can.</p>
      </div>
    );
  }

  const busy = status === "loading";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mono-label mb-3 block">
            Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
            placeholder="Your name"
            disabled={busy}
          />
        </div>
        <div>
          <label htmlFor="email" className="mono-label mb-3 block">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            placeholder="your@email.com"
            disabled={busy}
          />
        </div>
      </div>

      <div>
        <label htmlFor="type" className="mono-label mb-3 block">
          Enquiry type
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={fieldClass}
          disabled={busy}
        >
          <option value="prints">Prints</option>
          <option value="commission">Commission</option>
          <option value="press">Press / Media</option>
          <option value="general">General</option>
        </select>
      </div>

      <div>
        <label htmlFor="subject" className="mono-label mb-3 block">
          Subject
        </label>
        <input
          id="subject"
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={fieldClass}
          placeholder="What&rsquo;s this about?"
          disabled={busy}
        />
      </div>

      <div>
        <label htmlFor="message" className="mono-label mb-3 block">
          Message
        </label>
        <textarea
          id="message"
          rows={6}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${fieldClass} resize-none`}
          placeholder="Your message…"
          disabled={busy}
        />
      </div>

      {status === "error" && (
        <p className="mono-label text-accent">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="pill pill-primary disabled:opacity-50"
      >
        <Send size={16} />
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
