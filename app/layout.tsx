import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { TopNav } from '@/components/navigation/TopNav';
import { MobileHeader, MobileNav } from '@/components/navigation/MobileNav';
import { Footer } from '@/components/navigation/Footer';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

/**
 * Lufga is a licensed typeface; Outfit is the closest open geometric sans with
 * the same rounded, confident character, so the type system holds either way.
 */
const display = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Chennai Rent Prices & Owner-Direct Homes | NammaChennai.rent',
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'See what Chennai renters are actually paying, compare neighbourhoods and find owner-direct homes with zero brokerage.',
  applicationName: SITE_NAME,
  keywords: ['Chennai rent', 'rent in Chennai', 'OMR rent', 'owner direct rental Chennai', 'Chennai rental prices'],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_IN',
    url: SITE_URL,
    title: 'Chennai Rent Prices & Owner-Direct Homes',
    description:
      'Rent intelligence for Chennai — real renter reports, locality medians and owner-direct homes.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chennai Rent Prices & Owner-Direct Homes',
    description: 'Know what rent should cost in Chennai.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  themeColor: '#141414',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en-IN" className={display.variable}>
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-pill focus:bg-ink focus:px-5 focus:py-3 focus:text-white"
        >
          Skip to content
        </a>

        <TopNav />
        <MobileHeader />
        <main id="main" className="pb-24 lg:pb-0">
          {children}
        </main>
        <Footer />
        <MobileNav />
        <PageViewTracker />

        {posthogKey ? (
          <Script id="posthog" strategy="afterInteractive">
            {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('${posthogKey}',{api_host:'${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'}'});`}
          </Script>
        ) : null}

        {gaId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
