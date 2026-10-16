// Fixed vocabularies shared by the schema and the seed. Guests filter on these,
// so values are stable camelCase keys and titles are what editors see.

export const propertyTypes = [
  {title: 'Cabin', value: 'cabin'},
  {title: 'Beach', value: 'beach'},
  {title: 'City', value: 'city'},
  {title: 'Villa', value: 'villa'},
] as const

export const amenities = [
  {title: 'Hot tub', value: 'hotTub'},
  {title: 'Pool', value: 'pool'},
  {title: 'Fireplace', value: 'fireplace'},
  {title: 'Fire pit', value: 'firePit'},
  {title: 'Sauna', value: 'sauna'},
  {title: 'Wifi', value: 'wifi'},
  {title: 'Kitchen', value: 'kitchen'},
  {title: 'Workspace', value: 'workspace'},
  {title: 'Parking', value: 'parking'},
  {title: 'Washer', value: 'washer'},
  {title: 'Air conditioning', value: 'ac'},
  {title: 'Ocean view', value: 'oceanView'},
  {title: 'Lake view', value: 'lakeView'},
  {title: 'Mountain view', value: 'mountainView'},
  {title: 'Beach access', value: 'beachAccess'},
  {title: 'BBQ grill', value: 'bbq'},
  {title: 'EV charger', value: 'evCharger'},
] as const

export type PropertyType = (typeof propertyTypes)[number]['value']
export type Amenity = (typeof amenities)[number]['value']

export const policyKinds = [
  {title: 'Cancellation', value: 'cancellation'},
  {title: 'Booking', value: 'booking'},
  {title: 'Payment', value: 'payment'},
  {title: 'Pets', value: 'pets'},
  {title: 'Damage', value: 'damage'},
  {title: 'Check-in', value: 'checkIn'},
  {title: 'Guest refund', value: 'guestRefund'},
] as const

export const responseTimes = [
  {title: 'Within an hour', value: 'withinHour'},
  {title: 'Within a few hours', value: 'withinFewHours'},
  {title: 'Within a day', value: 'withinDay'},
] as const

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
export const isTime = (value: unknown) =>
  value === undefined || (typeof value === 'string' && timePattern.test(value)) || 'Use 24-hour HH:MM'
