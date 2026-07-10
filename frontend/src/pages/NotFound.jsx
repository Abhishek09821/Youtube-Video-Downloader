import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-32 text-center">
      <span className="text-xs font-semibold uppercase tracking-widest text-red-glow">
        404
      </span>
      <h1 className="mt-4 text-4xl font-bold text-metallic sm:text-5xl">Page not found</h1>
      <p className="mx-auto mt-4 max-w-md text-silver">
        The page you are looking for does not exist.
      </p>
      <Link to="/" className="btn-red mt-8 px-6 py-3">
        Back home
      </Link>
    </section>
  )
}
