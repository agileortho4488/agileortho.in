export default function Contact() {
  return (
    <main data-testid="contact-page" className="bg-white">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1
          data-testid="contact-title"
          className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
        >
          Contact
        </h1>
        <div
          data-testid="contact-body"
          className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600"
        >
          For corrections, safety issues, or feedback, please email the platform
          administrators. (MVP placeholder)
        </div>
      </section>
    </main>
  );
}
