import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Book icon */}
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gray-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-12 w-12 text-gray-400"
          >
            <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
          </svg>
        </div>

        {/* 404 text */}
        <h1 className="text-6xl font-bold text-gray-900">404</h1>

        {/* Message */}
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-gray-800">
            Page not found
          </h2>
          <p className="max-w-md text-sm text-gray-500">
            Looks like this page got lost between the chapters. The page you're
            looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Back to home button */}
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Back to Bookmarked
        </Link>
      </div>
    </div>
  );
}
