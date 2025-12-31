export default function About() {
  return (
    <main data-testid="about-page" className="bg-white">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1
          data-testid="about-title"
          className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
        >
          About OrthoConnect
        </h1>
        <div
          data-testid="about-body"
          className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600"
        >
          OrthoConnect is a patient-first, ethical, non-commercial platform for
          India. We focus on simple education and helping patients find nearby
          orthopaedic surgeons — without ads, paid listings, rankings, or
          appointment booking.
        </div>
      </section>
    </main>
  );
}
