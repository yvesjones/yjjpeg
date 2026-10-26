import type { Metadata } from "next";

import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact | YJ.JPEG",
  description: "Commissions, prints and enquiries — Yves Jones photography.",
};

/** Its own page rather than a band on the home page, reached from the nav. */
export default function ContactPage() {
  return (
    <main className="pt-16">
      <section className="topo topo-fade px-6 pt-10 pb-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 flex items-start justify-between gap-6">
            <div className="mono-label flex items-center gap-3">
              <span className="text-accent">03</span>
              <span className="hidden h-px w-8 bg-[var(--hairline)] sm:block" />
              <span>YJ_CONTACT</span>
            </div>
            <div className="mono-readout text-right leading-relaxed">
              <div>RESPONSE: WITHIN 48H</div>
            </div>
          </div>

          <h1 className="display display-xl">Work with me</h1>
          <p className="mono mt-6 text-sm leading-relaxed text-muted">
            Commissions &amp; enquiries
          </p>
        </div>
      </section>

      <section className="px-6 pt-6 pb-24">
        <div className="mx-auto max-w-3xl">
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
