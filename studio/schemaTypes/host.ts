import {UserIcon} from '@sanity/icons/User'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {responseTimes} from './lists'

// Shared across stays: one host can run several.
export const host = defineType({
  name: 'host',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'name', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'photo', type: 'image', options: {hotspot: true}}),
    defineField({name: 'bio', type: 'text', rows: 3}),
    defineField({name: 'isSuperhost', title: 'Superhost', type: 'boolean', initialValue: false}),
    defineField({name: 'hostingSince', type: 'date'}),
    defineField({
      name: 'responseTime',
      type: 'string',
      options: {list: [...responseTimes], layout: 'radio'},
    }),
    defineField({
      name: 'languages',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
    }),
  ],
  preview: {
    select: {title: 'name', superhost: 'isSuperhost', media: 'photo'},
    prepare: ({title, superhost, media}) => ({title, subtitle: superhost ? 'Superhost' : undefined, media}),
  },
})
