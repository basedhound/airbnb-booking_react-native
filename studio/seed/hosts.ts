// Fictional hosts, shared across stays. No photos: the app shows an initial.

export type SeedHost = {
  slug: string
  name: string
  bio: string
  isSuperhost: boolean
  hostingSince: string
  responseTime: 'withinHour' | 'withinFewHours' | 'withinDay'
  languages: string[]
}

export const hosts: SeedHost[] = [
  {
    slug: 'maya-alvarez',
    name: 'Maya Alvarez',
    bio: 'I restore old mountain cabins around Southern California and keep them simple: good beds, real firewood, and a hot tub that is always clean.',
    isSuperhost: true,
    hostingSince: '2016-05-01',
    responseTime: 'withinHour',
    languages: ['English', 'Spanish'],
  },
  {
    slug: 'tom-whitaker',
    name: 'Tom Whitaker',
    bio: 'Retired forester. I look after two cabins in the Pacific Northwest and can tell you which trails are muddy this week.',
    isSuperhost: true,
    hostingSince: '2014-09-01',
    responseTime: 'withinFewHours',
    languages: ['English'],
  },
  {
    slug: 'giulia-moretti',
    name: 'Giulia Moretti',
    bio: 'My family has hosted guests in the Dolomites and Tuscany for three generations. I am happy to book restaurants and guides.',
    isSuperhost: true,
    hostingSince: '2015-03-01',
    responseTime: 'withinHour',
    languages: ['Italian', 'English', 'German'],
  },
  {
    slug: 'erik-lindqvist',
    name: 'Erik Lindqvist',
    bio: 'I build saunas and run two lake cabins. Ask me about ice fishing in winter and canoe routes in summer.',
    isSuperhost: false,
    hostingSince: '2019-11-01',
    responseTime: 'withinFewHours',
    languages: ['English', 'Swedish'],
  },
  {
    slug: 'jess-carter',
    name: 'Jess Carter',
    bio: 'Beach houses on the Atlantic and Gulf coasts. Families and dogs are welcome at most of my places.',
    isSuperhost: true,
    hostingSince: '2013-06-01',
    responseTime: 'withinHour',
    languages: ['English'],
  },
  {
    slug: 'ana-souza',
    name: 'Ana Souza',
    bio: 'I grew up in Lisbon and host apartments and cottages along the Portuguese coast.',
    isSuperhost: true,
    hostingSince: '2017-02-01',
    responseTime: 'withinHour',
    languages: ['Portuguese', 'English', 'French'],
  },
  {
    slug: 'kai-nakamura',
    name: 'Kai Nakamura',
    bio: 'Surfer and host in Hawaii and Australia. I leave boards and local tips at every place.',
    isSuperhost: false,
    hostingSince: '2020-04-01',
    responseTime: 'withinFewHours',
    languages: ['English', 'Japanese'],
  },
  {
    slug: 'sofia-reyes',
    name: 'Sofia Reyes',
    bio: 'I host in Mexico City, Tulum and Bocas del Toro, and I love sending guests to my favorite taquerias.',
    isSuperhost: true,
    hostingSince: '2016-10-01',
    responseTime: 'withinHour',
    languages: ['Spanish', 'English'],
  },
  {
    slug: 'nikos-papadakis',
    name: 'Nikos Papadakis',
    bio: 'Villas in the Cyclades. I meet every guest at the port and can arrange boat days.',
    isSuperhost: true,
    hostingSince: '2015-07-01',
    responseTime: 'withinFewHours',
    languages: ['Greek', 'English'],
  },
  {
    slug: 'wayan-putra',
    name: 'Wayan Putra',
    bio: 'I manage garden villas in Bali with a small local team who cook breakfast every morning.',
    isSuperhost: false,
    hostingSince: '2018-08-01',
    responseTime: 'withinDay',
    languages: ['Indonesian', 'English'],
  },
  {
    slug: 'daniel-brooks',
    name: 'Daniel Brooks',
    bio: 'Architect hosting city apartments in New York, Chicago, Paris and Copenhagen. Fast wifi and a real desk in every one.',
    isSuperhost: true,
    hostingSince: '2017-05-01',
    responseTime: 'withinHour',
    languages: ['English', 'French'],
  },
  {
    slug: 'lena-park',
    name: 'Lena Park',
    bio: 'Desert homes in Palm Springs and Scottsdale, plus one apartment in Tokyo where I lived for six years.',
    isSuperhost: false,
    hostingSince: '2021-01-01',
    responseTime: 'withinFewHours',
    languages: ['English', 'Korean', 'Japanese'],
  },
]
