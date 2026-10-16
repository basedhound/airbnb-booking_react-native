// Sample onboarding content. Photos are Unsplash placeholders.
export type Slide = {
  id: string;
  title: string;
  body: string;
  image: string;
  location: string;
};

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;

export const slides: Slide[] = [
  {
    id: "story",
    title: "Find a stay that fits your story",
    body: "From mountain cabins to oceanfront villas, roam helps you find unforgettable stays for every kind of trip.",
    image: unsplash("1636886519725-6a048800b5b4"),
    location: "Whistler, BC",
  },
  {
    id: "describe",
    title: "Just say what you're after",
    body: "Describe your trip in one sentence, like a quiet cabin with a hot tub, and roam ranks the stays that fit.",
    image: unsplash("1762254923872-5bdc4210eb90"),
    location: "Aqaba, Jordan",
  },
  {
    id: "answers",
    title: "Answers straight from the stay",
    body: "Ask about check-in, pets or cancellations and see the stay's own rules, word for word, with their source.",
    image: unsplash("1473213430984-9b37e45cd8b1"),
    location: "Skykomish, WA",
  },
];
