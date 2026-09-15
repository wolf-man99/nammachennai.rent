import { ButtonLink, Container, Eyebrow } from '@/components/ui/primitives';

export default function NotFound() {
  return (
    <Container className="py-24 lg:py-36">
      <div className="mx-auto max-w-xl text-center">
        <Eyebrow>404</Eyebrow>
        <h1 className="mt-5 text-headline font-semibold uppercase tracking-tight">
          Nothing here
        </h1>
        <p className="mt-5 text-[0.9375rem] leading-relaxed text-muted">
          That page does not exist. We cover Chennai localities only — try the rent map or
          search for the area you are looking at.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/map" size="lg">Explore Rent Map</ButtonLink>
          <ButtonLink href="/explore" variant="outline" size="lg">Browse localities</ButtonLink>
        </div>
      </div>
    </Container>
  );
}
