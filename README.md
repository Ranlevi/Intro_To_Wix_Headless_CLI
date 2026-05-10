# Aliat Gag Wix Headless Demo

This project is a one-page Wix-managed Headless demo site for the band Aliat Gag. It uses Astro for the frontend and Wix CRM Contacts as the backend for gig booking requests.

Visitors can browse the band page, view a photo gallery, and submit a booking request. The booking form posts to an Astro API endpoint, which creates or reuses a Wix CRM contact by email address and stores the submitted gig details as a note on that contact.

## Tech Stack

- [Astro](https://astro.build/) for the website frontend
- [Wix CLI](https://dev.wix.com/docs/go-headless) for local development, preview, and release
- `@wix/sdk` for server-side Wix API access
- `@wix/crm` for contacts and notes

## Project Structure

```text
src/
  layouts/
    Layout.astro            Shared page layout
  pages/
    index.astro             One-page band website and booking form
    api/
      book-gig.ts           Booking endpoint that writes to Wix CRM
public/
  images/                   Hero and gallery images
```

## Booking Flow

1. The form in `src/pages/index.astro` collects the visitor name, email, event date, and message.
2. Browser-side JavaScript validates the form and sends a `POST` request to `/api/book-gig`.
3. `src/pages/api/book-gig.ts` validates the submitted form data again on the server.
4. The endpoint searches Wix CRM for an existing contact with the submitted email address.
5. If no contact exists, the endpoint creates one.
6. The endpoint creates a Wix CRM note containing the booking request details.

## Environment Variables

The booking endpoint requires Wix app credentials. Create or update `.env.local` with:

```text
WIX_CLIENT_ID=...
WIX_CLIENT_SECRET=...
WIX_CLIENT_INSTANCE_ID=...
```

These values are read in `src/pages/api/book-gig.ts` when creating the Wix SDK client.

## Development

Install dependencies:

```bash
npm install
```

Start the Wix local development server:

```bash
npm run dev
```

By default, the Wix dev server runs on port `4321`.

## Build, Preview, and Release

Build the project:

```bash
npm run build
```

Create a Wix preview deployment:

```bash
npm run preview
```

Release the project:

```bash
npm run release
```

These scripts wrap the Wix CLI commands defined in `package.json`.

## Useful Commands

```bash
npm run dev       # Start local development
npm run build     # Build the app
npm run preview   # Create a Wix preview deployment
npm run release   # Release to Wix
npm run generate  # Generate a new Wix extension
npm run env       # Manage Wix environment variables
```

## Notes

- This is a demo project for a YouTube walkthrough of Wix Headless.
- The site is Wix-managed Headless, so deployment and hosting are handled through Wix.
- Booking requests are stored in Wix CRM Contacts, not in a local database.
