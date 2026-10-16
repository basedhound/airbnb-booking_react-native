import {HomeIcon} from '@sanity/icons/Home'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {amenities, isTime, propertyTypes} from './lists'

// A stay. Everything guests filter on is a typed field (exact GROQ filters);
// descriptive text lives here too, because embeddings only see this document.
export const property = defineType({
  name: 'property',
  title: 'Stay',
  type: 'document',
  icon: HomeIcon,
  groups: [
    {name: 'basics', title: 'Basics', default: true},
    {name: 'place', title: 'Place'},
    {name: 'layout', title: 'Layout'},
    {name: 'price', title: 'Price'},
    {name: 'rules', title: 'Rules'},
    {name: 'copy', title: 'Copy'},
    {name: 'media', title: 'Media'},
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      group: 'basics',
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'basics',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'type',
      type: 'string',
      group: 'basics',
      options: {list: [...propertyTypes], layout: 'radio', direction: 'horizontal'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'host',
      type: 'reference',
      group: 'basics',
      to: [{type: 'host'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'rating',
      type: 'number',
      group: 'basics',
      description: 'Average guest rating across all reviews.',
      validation: (rule) => rule.min(0).max(5).precision(2),
    }),
    defineField({
      name: 'reviewCount',
      type: 'number',
      group: 'basics',
      description: 'Total reviews, including ones not stored as documents.',
      validation: (rule) => rule.integer().min(0),
    }),

    defineField({name: 'city', type: 'string', group: 'place', validation: (rule) => rule.required()}),
    defineField({
      name: 'region',
      type: 'string',
      group: 'place',
      description: 'State, province or island, e.g. "CA" or "Bali". Leave empty to show the country.',
    }),
    defineField({name: 'country', type: 'string', group: 'place', validation: (rule) => rule.required()}),
    defineField({name: 'neighborhood', type: 'string', group: 'place'}),
    defineField({name: 'location', type: 'geopoint', group: 'place'}),

    defineField({
      name: 'maxGuests',
      title: 'Max guests',
      type: 'number',
      group: 'layout',
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({
      name: 'bedrooms',
      type: 'number',
      group: 'layout',
      description: '0 for a studio.',
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({name: 'beds', type: 'number', group: 'layout', validation: (rule) => rule.required().integer().min(1)}),
    defineField({
      name: 'bathrooms',
      type: 'number',
      group: 'layout',
      validation: (rule) => rule.required().min(0.5).precision(1),
    }),
    defineField({
      name: 'amenities',
      type: 'array',
      group: 'layout',
      of: [defineArrayMember({type: 'string'})],
      options: {list: [...amenities], layout: 'grid'},
      validation: (rule) => rule.unique(),
    }),

    defineField({
      name: 'pricePerNight',
      title: 'Price per night (USD)',
      type: 'number',
      group: 'price',
      validation: (rule) => rule.required().integer().positive(),
    }),
    defineField({
      name: 'cleaningFee',
      title: 'Cleaning fee (USD)',
      type: 'number',
      group: 'price',
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({
      name: 'minNights',
      title: 'Minimum nights',
      type: 'number',
      group: 'price',
      initialValue: 1,
      validation: (rule) => rule.integer().min(1),
    }),
    defineField({
      name: 'weeklyDiscountPercent',
      title: 'Weekly discount (%)',
      type: 'number',
      group: 'price',
      validation: (rule) => rule.integer().min(0).max(50),
    }),

    defineField({
      name: 'houseRules',
      type: 'object',
      group: 'rules',
      options: {collapsible: false},
      fields: [
        defineField({name: 'checkInTime', title: 'Check-in from', type: 'string', initialValue: '15:00', validation: (rule) => rule.required().custom(isTime)}),
        defineField({name: 'checkOutTime', title: 'Check-out by', type: 'string', initialValue: '11:00', validation: (rule) => rule.required().custom(isTime)}),
        defineField({name: 'quietHoursFrom', type: 'string', validation: (rule) => rule.custom(isTime)}),
        defineField({name: 'quietHoursTo', type: 'string', validation: (rule) => rule.custom(isTime)}),
        defineField({name: 'petsAllowed', type: 'boolean', initialValue: false, validation: (rule) => rule.required()}),
        defineField({
          name: 'maxPets',
          type: 'number',
          hidden: ({parent}) => !parent?.petsAllowed,
          validation: (rule) => rule.integer().min(1),
        }),
        defineField({
          name: 'petFee',
          title: 'Pet fee per stay (USD)',
          type: 'number',
          hidden: ({parent}) => !parent?.petsAllowed,
          validation: (rule) => rule.integer().min(0),
        }),
        defineField({name: 'smokingAllowed', type: 'boolean', initialValue: false}),
        defineField({name: 'partiesAllowed', type: 'boolean', initialValue: false}),
        defineField({name: 'additionalRules', type: 'array', of: [defineArrayMember({type: 'string'})]}),
      ],
    }),
    defineField({
      name: 'cancellationPolicy',
      type: 'reference',
      group: 'rules',
      to: [{type: 'policy'}],
      options: {filter: 'kind == "cancellation"'},
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'facts',
      type: 'array',
      group: 'copy',
      description: 'Plain facts about this stay. Generated copy may only use these and the typed fields.',
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) => rule.min(3),
    }),
    defineField({
      name: 'vibes',
      type: 'array',
      group: 'copy',
      description: 'Soft qualities guests ask for: quiet, cozy, secluded…',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
    }),
    defineField({
      name: 'summary',
      type: 'string',
      group: 'copy',
      description: 'One line shown on search results.',
      validation: (rule) => rule.max(90),
    }),
    defineField({name: 'description', type: 'text', rows: 5, group: 'copy'}),
    defineField({
      name: 'highlights',
      type: 'array',
      group: 'copy',
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) => rule.max(4),
    }),
    defineField({
      name: 'copyReview',
      type: 'object',
      group: 'copy',
      description: 'Written by the seed script after checking generated copy against the facts.',
      readOnly: true,
      fields: [
        defineField({
          name: 'status',
          type: 'string',
          options: {list: ['passed', 'failed']},
        }),
        defineField({name: 'checkedAt', type: 'datetime'}),
        defineField({name: 'attempts', type: 'number'}),
        defineField({name: 'sourceHash', type: 'string'}),
        defineField({name: 'unsupportedClaims', type: 'array', of: [defineArrayMember({type: 'string'})]}),
      ],
    }),

    defineField({
      name: 'photos',
      type: 'array',
      group: 'media',
      description: 'The first photo is the cover.',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [defineField({name: 'alt', type: 'string', validation: (rule) => rule.required()})],
        }),
      ],
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    select: {title: 'title', city: 'city', price: 'pricePerNight', media: 'photos.0'},
    prepare: ({title, city, price, media}) => ({
      title,
      subtitle: [city, price ? `$${price}/night` : null].filter(Boolean).join(' · '),
      media,
    }),
  },
  orderings: [
    {title: 'Rating', name: 'ratingDesc', by: [{field: 'rating', direction: 'desc'}]},
    {title: 'Price', name: 'priceAsc', by: [{field: 'pricePerNight', direction: 'asc'}]},
  ],
})
