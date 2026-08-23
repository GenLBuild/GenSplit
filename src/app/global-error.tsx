'use client';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ padding: 24, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        <h2>Real error caught:</h2>
        <p>{error?.message}</p>
        <p>Digest: {error?.digest}</p>
        <pre>{error?.stack}</pre>
      </body>
    </html>
  );
}