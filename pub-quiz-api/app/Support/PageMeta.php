<?php

namespace App\Support;

/**
 * Everything the shell needs rewritten for one route. Mirrors the options the
 * frontend's useSeo hook takes, so the markup a crawler receives and the markup
 * React settles on after hydration say the same thing. They must agree: a title
 * that changes the moment JavaScript runs is a signal Google distrusts.
 */
class PageMeta
{
    public function __construct(
        /** Page title. The site name is appended unless it is already the title. */
        public string $title,
        public string $description,
        /** Path without the domain, e.g. "/mapa". */
        public string $path,
        public ?string $image = null,
        /** JSON-LD for this route, encoded into a script tag in the head. */
        public ?array $jsonLd = null,
        /**
         * The page's own content, rendered as HTML for the request that has no
         * JavaScript. Not a place for keywords the user will never see - the
         * React tree draws this same information a moment later.
         */
        public ?string $noscript = null,
        /** False for pages that exist but have nothing worth a search result. */
        public bool $index = true,
    ) {
    }
}
