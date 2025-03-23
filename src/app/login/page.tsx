import Link from 'next/link';

const errorMessages: { [key: string]: string } = {
  invalid_request: 'Invalid request. Please try again.',
  no_code: 'No authorization code received from Lichess.',
  auth_failed: 'Authentication failed. Please try again.',
  invalid_grant: 'Invalid authorization grant. Please try again.',
  access_denied: 'Access was denied by Lichess.',
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; description?: string };
}) {
  const errorMessage = searchParams.error
    ? searchParams.description || errorMessages[searchParams.error] || searchParams.error
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="mb-8 text-4xl font-bold text-gray-900">
        Login to ChessMentor
      </h1>
      {errorMessage && (
        <div className="mb-8 rounded-lg bg-red-100 p-4 text-red-700">
          {errorMessage}
        </div>
      )}
      <Link
        href="/api/auth/lichess"
        className="rounded-lg bg-[#4d4d4d] px-6 py-3 text-white hover:bg-[#3d3d3d] transition-colors"
      >
        Login with Lichess
      </Link>
    </div>
  );
} 