'use client';

import { useEffect } from 'react';
import { Container, Eyebrow, Button, ButtonLink } from '@/components/ui/primitives';

/**
 * A transient backend blip should never present as a broken product. This
 * catches a failed render and offers the one thing that usually fixes it.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Page render failed:', error);
  }, [error]);

  return (
    <Container className="py-20 lg:py-32">
      <div className="mx-auto max-w-xl text-center">
        <Eyebrow>Something went wrong</Eyebrow>
        <h1 className="mt-5 text-headline font-semibold uppercase tracking-tight">
          That didn&apos;t load
        </h1>
        <p className="mt-5 text-[0.9375rem] leading-relaxed text-muted">
          We couldn&apos;t reach our data just then. It is usually a momentary hiccup — trying again
          normally works.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={reset}>
            Try again
          </Button>
          <ButtonLink href="/" variant="outline" size="lg">
            Go to the homepage
          </ButtonLink>
        </div>
        {error.digest ? (
          <p className="mt-8 text-xs text-faint">Reference: {error.digest}</p>
        ) : null}
      </div>
    </Container>
  );
}
