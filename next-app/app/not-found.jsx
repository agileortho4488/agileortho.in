import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-ink flex flex-col items-center justify-center gap-6 text-center px-6">
      <h1 className="text-4xl font-bold">Product Not Found</h1>
      <p className="text-white/60">This product is not in the Agile Healthcare catalog.</p>
      <Link href="/" className="px-6 py-3 bg-gold text-ink font-bold rounded-sm">Back to Home</Link>
    </main>
  );
}
