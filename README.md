# AI Doctor — Your Smart Health Companion

AI Doctor is a production-ready, full-stack health assistant built with Next.js 14. It combines Clerk authentication, a modern Tailwind + shadcn/ui design system, MongoDB persistence, and Google Gemini 2.0 Flash intelligence to deliver secure virtual consultations, analytics, goal tracking, and downloadable health reports.

## ✨ Features

- **Protected experience** — Every route except `/sign-in` and `/sign-up` is guarded by Clerk middleware.
- **Gemini-powered consultations** — Chat with the AI Doctor using text or optional images with live typing states.
- **Goal tracking** — Create health goals, update progress, and stay motivated with AI nudges.
- **Analytics dashboard** — Recharts visualizations, AI confidence trends, and Gemini-generated wellness insights.
- **PDF health reports** — One-click Gemini summaries compiled into branded PDFs for sharing with providers.
- **Modern UI** — Glassmorphism styling, Framer Motion micro-animations, Lucide icons, and persistent light/dark themes.

## 🧱 Tech Stack

- [Next.js 14 (App Router)](https://nextjs.org/) with TypeScript
- [Clerk](https://clerk.com/) for authentication and user management
- [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), and [Framer Motion](https://www.framer.com/motion/)
- [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/)
- [Recharts](https://recharts.org/) for analytics visualizations
- [Google Gemini 2.0 Flash API](https://ai.google.dev/) for medical-grade responses
- [pdfkit](https://pdfkit.org/) for server-side PDF generation

## 🚀 Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy the example file and populate your secrets:

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Description |
   | --- | --- |
   | `CLERK_SECRET_KEY` | Clerk backend key (Server API key). |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key for the browser. |
   | `MONGODB_URI` | MongoDB Atlas connection string. |
   | `GEMINI_API_KEY` | Google Generative Language API key (Gemini 2.0 Flash). |

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000). Sign up with Clerk to explore the protected routes.

4. **Production build**

   ```bash
   npm run build
   npm start
   ```

## 📁 Project Structure

```
app/
  (auth)/        Public sign-in & sign-up routes
  (protected)/   Authenticated experiences (consult, dashboard, goals, reports, profile)
  api/           Route handlers for chat, goals, dashboard, and reports
components/      Reusable UI primitives, layout, and providers
lib/             Database and Gemini helpers
models/          Mongoose schemas
public/          Static assets (e.g., doctor avatar)
```

## 🧪 Testing

This project relies on Next.js linting and type checks. Run:

```bash
npm run lint
```

## 📦 Deployment Notes

- Deploy to [Vercel](https://vercel.com/) for optimal Next.js support.
- Provision a MongoDB Atlas cluster and add the connection string to Vercel environment variables.
- Set the Clerk environment keys and Gemini API key in your hosting provider.
- Ensure the `PDFKit` native dependencies are supported (Vercel Node runtimes are compatible).

## 🔐 Security Considerations

- All API routes verify authenticated users via Clerk’s `auth()` helper.
- Chats, goals, and reports are scoped by `userId` for isolation.
- Gemini requests include a medical assistant prompt for safe, professional responses.

## 🙌 Credits

- Doctor illustration avatar generated as a lightweight SVG.
- Built with ❤️ by the AI Doctor engineering team.
