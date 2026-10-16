import {CommentIcon} from '@sanity/icons/Comment'
import {defineField, defineType} from 'sanity'

export const review = defineType({
  name: 'review',
  type: 'document',
  icon: CommentIcon,
  fields: [
    defineField({
      name: 'property',
      title: 'Stay',
      type: 'reference',
      to: [{type: 'property'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'guestName',
      type: 'string',
      description: 'First name only.',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'rating', type: 'number', validation: (rule) => rule.required().integer().min(1).max(5)}),
    defineField({name: 'stayedAt', type: 'date', options: {dateFormat: 'MMMM YYYY'}}),
    defineField({name: 'text', type: 'text', rows: 4, validation: (rule) => rule.required()}),
    // Lets the seed find this review again on a rerun.
    defineField({name: 'seedKey', type: 'string', hidden: true, readOnly: true}),
  ],
  preview: {
    select: {name: 'guestName', rating: 'rating', stay: 'property.title'},
    prepare: ({name, rating, stay}) => ({title: `${name} · ${'★'.repeat(rating ?? 0)}`, subtitle: stay}),
  },
})
