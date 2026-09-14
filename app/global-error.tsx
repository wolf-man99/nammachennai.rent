'use client';

import './globals.css';

/** Last resort: the root layout itself failed, so this renders its own document. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#f4f4f1',
          color: '#141414',
          fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a1a19a' }}>
            Chennai.rent
          </p>
          <h1 style={{ margin: '20px 0 0', fontSize: 32, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Something went wrong
          </h1>
          <p style={{ margin: '16px 0 0', fontSize: 15, lineHeight: 1.6, color: '#6f6f69' }}>
            We hit an unexpected error. Trying again usually clears it.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 28,
              height: 52,
              padding: '0 28px',
              borderRadius: 999,
              border: 'none',
              background: '#141414',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ marginTop: 28, fontSize: 12, color: '#a1a19a' }}>Reference: {error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
