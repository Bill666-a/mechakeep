# MechaKeep

A complete, responsive mecha collection prototype built with semantic HTML, custom CSS, native JavaScript, and Vite. No UI framework or animation library.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` creates the production site in `dist/`; `npm run preview` serves that build. Hash routing supports static hosting without server rewrite rules. Use a web server, rather than opening `index.html` directly.

## Pages and features

- Asymmetric, image-led Bento overview featuring Hot Toys, Pacific Rim and Gundam; restrained IntersectionObserver reveals.
- Model library with combined multilingual search and collection filters, sorting, animated results and empty states.
- Seventeen individual model pages with product imagery and model metadata.
- Persistent favourites, animated hearts, and accessible toast feedback.
- Editorial build gallery and keyboard-accessible build dialogs.
- Build submission with validated image upload, live preview, client-side image resizing, local saving, and deliberate deletion.
- Month-based release calendar with status filters.
- Responsive navigation, visible keyboard focus, a skip link, and reduced-motion support.

Favourites and builds live in localStorage on the current browser/device. No authentication, backend, public community uploads, purchases, or real-time release data are connected. Image uploads are never sent to a server. Browser storage limits produce a visible error rather than a false success.

## Validation

```sh
npm test
npm run build
```

End-to-end tests use an installed Microsoft Edge browser via Playwright. If Edge is unavailable, install Playwright Chromium (`npx playwright install chromium`) and remove `channel: 'msedge'` from `playwright.config.js`.

## Content and credits

Product names identify actual model kits. Reference prices are illustrative. The release tracker uses explicitly labelled fictional 2026 restock dates. Editorial samples are official product photography, not real community submissions.

Strike Freedom and inner-frame imagery: [GUNDAM.INFO / Bandai Spirits](https://en.gundam.info/content/mgex/strikefreedom/). Hot Toys product photography: [Toys Buying Agent](https://www.toysbuyingagent.com/). Other model images: [USA Gundam Store](https://www.usagundamstore.com/), with source URLs recorded in `public/assets/sources.json`. Copyright and trademarks remain with their respective owners. These assets are used for this educational design prototype; public or commercial reuse requires appropriate permissions. MechaKeep is not affiliated with these companies.

The interface follows a restrained white/grey palette with small blue accents. All animations use CSS, IntersectionObserver, or requestAnimationFrame. The site remains fully operable when `prefers-reduced-motion` is enabled.

## Collection update

The catalogue includes Hot Toys Iron Man Mark LXXXV (MMS528D30), Captain America (MMS536), Thor (MMS557), Spider-Man Classic Suit (VGM48), Bandai Soul of Chogokin Gipsy Danger (GX-77), and six Gundam kits. New entries use product references instead of unverified release dates. Gipsy Danger is displayed by its approximate 23 cm height, not an invented scale.

The design uses an asymmetric Bento grid, corner radii of at most 8 px, no decorative shadows, no hover image scaling, and no headline/subtitle/button hero composition.

All images reveal after decoding and entering the viewport, with a 950 ms fade and a small upward motion. This also covers filtered results, dialogs and upload previews. Gallery changes preload the next photograph before fading out the current one; rapid selections keep the latest choice. Reduced-motion preferences show images immediately.

## Supplied photo collection

12 user-supplied photographs are grouped into seven subjects, with the original watermarks retained. New detail galleries support keyboard-operable thumbnails. Chinese character and costume names are searchable. Unverified prices are omitted and sorted after entries with a reference price.

The new entries include Scarlet Witch (MMS652/MMS653 edition unresolved from the portrait), Spider-Man Brand New Day (MMS892), Captain America Stealth 2.0 (MMS783), Moon Knight (TMS075), Iron Spider Endgame (MMS761/MMS762AE edition unresolved), Iron Man MK85 standard (MMS528D30), and MK42 2.0 shown with the Deluxe display base (MMS759D66; boxed configuration not established from a photo). Earlier Endgame Captain America, Classic Suit Spider-Man, Thor, Gundam and Pacific Rim entries remain available.

See [the verification notes](research/PHOTO_CATALOGUE.md) for product references, qualifications, and photographer credits; [the photo manifest](public/assets/photo-catalogue.json) records the image grouping. Specifications were cross-checked against retailer listings, not presented as official manufacturer verification.

## Publish with GitHub Pages

This repository includes `.github/workflows/deploy-pages.yml`, which builds the Vite site and publishes `dist` whenever `main` or `master` receives a push.

1. Create a GitHub repository (for example, `mechakeep`) and push this project, including the `.github` folder.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` or `master`, then open the URL shown in the workflow run. For a repository named `mechakeep`, it is usually `https://你的用户名.github.io/mechakeep/`.

The site is a static frontend. Favourites and submitted builds remain in the browser's local storage; GitHub Pages does not provide user accounts or a shared database.
