import { Link } from "react-router";

export default function NotFound() {
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="text-center space-y-4">
        <div className="text-6xl">🧭</div>
        <h1 className="text-3xl font-bold text-foreground">Page not found</h1>
        <p className="text-muted-foreground">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <Link
          to="/"
          className="inline-block bg-primary text-white rounded-xl px-5 py-2.5"
          style={{ fontSize: 14, fontWeight: 600 }}
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
