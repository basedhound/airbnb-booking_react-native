// Roam's own policies (fictional). Answers quote this text word for word, so
// each paragraph should stand on its own. Strings become Portable Text blocks;
// a string starting with "## " is a heading and "- " is a bullet.

export type SeedPolicy = {
  slug: string
  title: string
  kind: 'cancellation' | 'booking' | 'payment' | 'pets' | 'damage' | 'checkIn' | 'guestRefund'
  summary: string
  body: string[]
}

export const policies: SeedPolicy[] = [
  {
    slug: 'flexible-cancellation',
    title: 'Flexible cancellation',
    kind: 'cancellation',
    summary: 'Full refund if you cancel at least 24 hours before check-in.',
    body: [
      'Cancel at least 24 hours before check-in time and you get a full refund of the nightly rate, cleaning fee and Roam service fee.',
      'If you cancel less than 24 hours before check-in, the first night is not refunded. All remaining nights and the cleaning fee are refunded.',
      'If you cancel after check-in, nights you have not stayed yet are refunded if you cancel at least 24 hours before they begin.',
      'Check-in time is the time listed in the stay’s house rules, in the stay’s local time zone.',
    ],
  },
  {
    slug: 'moderate-cancellation',
    title: 'Moderate cancellation',
    kind: 'cancellation',
    summary: 'Full refund if you cancel at least 5 days before check-in.',
    body: [
      'Cancel at least 5 days before check-in time and you get a full refund of the nightly rate, cleaning fee and Roam service fee.',
      'If you cancel less than 5 days before check-in, you get a 50% refund of the nightly rate for every night. The cleaning fee is refunded in full. The Roam service fee is not refunded.',
      'If you cancel after check-in, you get a 50% refund of the nightly rate for nights you have not stayed yet.',
      'Check-in time is the time listed in the stay’s house rules, in the stay’s local time zone.',
    ],
  },
  {
    slug: 'strict-cancellation',
    title: 'Strict cancellation',
    kind: 'cancellation',
    summary: 'Full refund within 48 hours of booking if check-in is at least 14 days away.',
    body: [
      'You get a full refund if you cancel within 48 hours of booking and check-in is at least 14 days away.',
      'If you cancel at least 7 days before check-in, you get a 50% refund of the nightly rate. The cleaning fee is refunded in full. The Roam service fee is not refunded.',
      'If you cancel less than 7 days before check-in, the nightly rate and the Roam service fee are not refunded. The cleaning fee is refunded in full.',
      'Check-in time is the time listed in the stay’s house rules, in the stay’s local time zone.',
    ],
  },
  {
    slug: 'booking-and-payment',
    title: 'Booking and payment',
    kind: 'payment',
    summary: 'You pay in full when you book. Prices are in US dollars.',
    body: [
      '## When you pay',
      'You pay the full price of your stay when you book. For stays that begin more than 30 days away, you can choose to pay half when you book and the rest 14 days before check-in.',
      '## What the price includes',
      'The total price is the nightly rate for each night, the stay’s cleaning fee, any pet fee, and the Roam service fee. You see the total before you confirm.',
      'The Roam service fee is 12% of the nightly rate total. Local taxes are added where the law requires them and are shown before you confirm.',
      'Weekly discounts apply automatically to stays of 7 nights or more and are taken off the nightly rate total.',
      '## Currency',
      'All prices on Roam are in US dollars. Your bank may charge a fee if your card is in another currency.',
      '## Minimum stay',
      'Each stay sets its own minimum number of nights. You can’t book fewer nights than the minimum.',
    ],
  },
  {
    slug: 'pets',
    title: 'Pets',
    kind: 'pets',
    summary: 'Pets are allowed only at stays whose house rules allow them.',
    body: [
      'You can bring pets only to stays whose house rules say pets are allowed. The house rules also list the maximum number of pets and any pet fee.',
      'The pet fee is charged once per stay, not per night.',
      'Service animals are always welcome, at every stay, and are never charged a pet fee. They don’t count toward a stay’s pet limit.',
      'You are responsible for cleaning up after your pet and for any damage your pet causes.',
      'Don’t leave pets alone at a stay unless they are crated.',
    ],
  },
  {
    slug: 'damage-and-security-deposit',
    title: 'Damage and security deposit',
    kind: 'damage',
    summary: 'No deposit is taken up front. Report damage within 24 hours.',
    body: [
      'Roam does not take a security deposit when you book.',
      'If something is damaged during your stay, tell your host through Roam within 24 hours. Accidents happen, and reporting them quickly keeps costs down.',
      'Hosts can ask for payment for damage within 14 days of check-out. Roam reviews every request and shares the photos and receipts with you before you are charged.',
      'Normal wear, such as a worn towel or a scuffed floor, is never charged.',
    ],
  },
  {
    slug: 'check-in-and-check-out',
    title: 'Check-in and check-out',
    kind: 'checkIn',
    summary: 'Check-in and check-out times are set in each stay’s house rules.',
    body: [
      'Check-in and check-out times are listed in each stay’s house rules.',
      'Your host sends check-in instructions through Roam 48 hours before check-in.',
      'Early check-in and late check-out depend on the host and are not guaranteed. Ask your host through Roam.',
      'Before you leave, take out the trash, start the dishwasher if there is one, and lock the door. You don’t need to strip the beds unless the house rules ask you to.',
      'Quiet hours, if a stay has them, are listed in its house rules.',
    ],
  },
  {
    slug: 'guest-refund',
    title: 'Guest refund policy',
    kind: 'guestRefund',
    summary: 'If a stay isn’t as described and your host can’t fix it, Roam refunds you.',
    body: [
      'If your stay has a serious problem that your host can’t fix, Roam will refund you or help you find a similar place.',
      'Serious problems include: the host can’t give you access, the stay isn’t clean or safe, a listed amenity such as the hot tub or pool doesn’t work, or the stay is meaningfully different from its listing.',
      'Report the problem to Roam within 72 hours of finding it. Photos help us resolve it quickly.',
      'The refund covers nights affected by the problem and can include the full stay if you can’t stay.',
    ],
  },
]
