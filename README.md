<div align="center">
  <br />
    <a href="" target="_blank">
      <img src="public/readme/readme-hero.webp" alt="Project Banner">
    </a>
  <br />

  <div>
<img src="https://img.shields.io/badge/-React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
<img src="https://img.shields.io/badge/-Expo-000020?style=for-the-badge&logo=expo&logoColor=white" />
<img src="https://img.shields.io/badge/-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/-NativeWind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
<br />
<img src="https://img.shields.io/badge/-Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white" />
<img src="https://img.shields.io/badge/-Sanity-F03E2F?style=for-the-badge&logo=sanity&logoColor=white" />
<img src="https://img.shields.io/badge/-PostHog-1D4AFF?style=for-the-badge&logo=posthog&logoColor=white" />
  </div>

  <h3 align="center">Roam | AI-Powered Airbnb Clone</h3>

   <div align="center">
     Build this project step by step with our detailed tutorial on <a href="https://www.youtube.com/watch?v=XUkNR-JfHwo" target="_blank"><b>JavaScript Mastery</b></a> YouTube. Join the JSM family!
    </div>
</div>

## 📋 <a name="table">Table of Contents</a>

1. ✨ [Introduction](#introduction)
2. ⚙️ [Tech Stack](#tech-stack)
3. 🔋 [Features](#features)
4. 🤸 [Quick Start](#quick-start)
5. 🔗 [Assets](#links)
6. 🚀 [More](#more)

## 🚨 Tutorial

This repository contains the code corresponding to an in-depth tutorial available on our YouTube channel, <a href="https://www.youtube.com/@javascriptmastery/videos" target="_blank"><b>JavaScript Mastery</b></a>.

If you prefer visual learning, this is the perfect resource for you. Follow our tutorial to learn how to build projects like these step-by-step in a beginner-friendly manner!

<a href="" target="_blank"><img src="https://github.com/sujatagunale/EasyRead/assets/151519281/1736fca5-a031-4854-8c09-bc110e3bc16d" /></a>

## <a name="introduction">✨ Introduction</a>

Roam is a complete Airbnb-style mobile app for iOS and Android where guests skip the filters and dropdowns entirely. Users type what they actually want, like a quiet cabin with a hot tub that allows dogs and costs under $300 a night, and natural-language search returns matching stays. Each property also has a chat that answers questions such as "can I bring my pet?" directly from that stay's own policies, so every reply is grounded in real source content.

Beyond the app itself, the project teaches a structured agentic engineering workflow: turning an idea into a build plan a coding agent can execute, building feature by feature without losing control of the codebase, and connecting real systems for auth, content, analytics and AI. The same process applies to startup apps, client projects, marketplaces and SaaS products.

If you're getting started and need assistance or face any bugs, join our active Discord community with over **50k+** members. It's a place where people help each other out.

<a href="https://discord.com/invite/n6EdbFJ" target="_blank"><img src="https://github.com/sujatagunale/EasyRead/assets/151519281/618f4872-1e10-42da-8213-1d69e486d02e" /></a>

## <a name="tech-stack">⚙️ Tech Stack</a>

- **[React Native](https://reactnative.dev/)** is an open-source framework for building native mobile apps with React. In Roam, it lets a single codebase power both the iOS and Android versions of the app using native UI components.

- **[Expo](https://expo.dev/)** is a platform and toolchain that simplifies building, running and shipping React Native apps. It handles the development server, device testing and access to native APIs, so Roam can go from an empty folder to a running app quickly.

- **[TypeScript](https://www.typescriptlang.org/)** is a strongly typed superset of JavaScript that catches errors during development. It keeps Roam's agent-written code predictable and easier to review as features are added one by one.

- **[NativeWind](https://www.nativewind.dev/)** brings Tailwind CSS utility classes to React Native. Roam uses it to style screens, property cards and detail pages consistently across iOS and Android.

- **[Clerk](https://jsm.dev/roam-clerk)** is a complete authentication and user management platform. It powers Roam's sign-up and sign-in flows and ties saved stays to each user's account.

- **[Sanity](https://jsm.dev/roam-sanity)** is a content platform used by companies like Shopify, Anthropic and Figma. In Roam, it stores the stay listings, generates the embeddings behind natural-language search, and serves as the knowledge base that grounds each property's chat answers.

- **[PostHog](https://jsm.dev/roam-posthog)** is an all-in-one product analytics platform. Roam uses it to track what users actually do, from their first search to the stays they save.

## <a name="features">🔋 Features</a>

👉 **Natural-Language Search**: Describe your ideal stay in plain English and get matching properties back, with no filters or dropdowns required.

👉 **Grounded Property Chat**: Ask questions like "can I bring my pet?" and get answers pulled straight from the stay's own policies, with nothing made up.

👉 **Authentication**: Secure sign-up and sign-in so every user has their own account and saved stays.

👉 **Browse Stays**: Explore available properties in a clean, mobile-first listing feed.

👉 **Saved Stays**: Save the properties you like and come back to them anytime.

👉 **Property Detail Pages**: Open any stay to see its full details, policies and the built-in chat.

👉 **Product Analytics**: Track user behavior across the whole journey, from first search to saved stay.

And many more, including code architecture and reusability.

## <a name="quick-start">🤸 Quick Start</a>

Follow these steps to set up the project locally on your machine.

**Prerequisites**

Make sure you have the following installed on your machine:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en)
- [npm](https://www.npmjs.com/) (Node Package Manager)

**Cloning the Repository**

```bash
git clone [git remote URL]
```

**Installation**

Install the project dependencies using npm:

```bash
npm install
```

**Set Up Environment Variables**

Create a new file named `.env` in the root of your project and add the following content:

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

EXPO_PUBLIC_SANITY_PROJECT_ID=
EXPO_PUBLIC_SANITY_DATASET=production
EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN=
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Password for the roam.demoN+clerk_test@example.com analytics demo accounts
ROAM_DEMO_PASSWORD=

SANITY_CONTEXT_MCP_URL=
SANITY_ORGANIZATION_TOKEN=
SANITY_CONTEXT_KB_URL=

TYPESAFE_AI_API_KEY=
```

Replace the placeholder values with your real credentials. You can get these by signing up at: [**Clerk**](https://jsm.dev/roam-clerk), [**Sanity**](https://jsm.dev/roam-sanity), [**PostHog**](https://jsm.dev/roam-posthog).

**Running the Project**

```bash
npx expo start
```

Scan the QR code with the Expo Go app on your phone, or press `i` for the iOS Simulator or `a` for the Android emulator.

## <a name="links">🔗 Assets</a>

Assets and snippets used in the project can be found in the **[video kit](https://jsm.dev/roam-kit)**.

<a href="https://jsm.dev/roam-kit" target="_blank">
  <img src="public/readme/readme-videokit.webp" alt="Video Kit Banner">
</a>

## <a name="more">🚀 More</a>

**Advance your skills with our Pro Course**

Enjoyed creating this project? Dive deeper into our PRO courses for a richer learning adventure. They're packed with
detailed explanations, cool features, and exercises to boost your skills. Give it a go!

<a href="https://jsm.dev/roam-engineer" target="_blank">
  <img src="public/readme/readme-jsmpro.webp" alt="Project Banner">
</a>