// Three recent reviews per stay, written from each stay's facts. Fictional
// guests, first names only. [guestName, rating, stayedAt (YYYY-MM), text]

type SeedReviewRow = [guestName: string, rating: number, stayedAt: string, text: string]

export const reviews: Record<string, SeedReviewRow[]> = {
  'modern-cabin-with-hot-tub': [
    ['Priya', 5, '2026-08', 'The hot tub faces straight into the pines and we used it every night. Firewood was stacked and ready.'],
    ['Marcus', 5, '2026-07', 'Quiet street, easy drive to the village, and our two dogs loved the yard.'],
    ['Elena', 5, '2026-06', 'Fire pit evenings were the highlight. Spotless and exactly as listed.'],
  ],
  'pine-forest-a-frame': [
    ['Jordan', 5, '2026-08', 'We spent hours in that hammock. The loft skylight is magic at night.'],
    ['Hannah', 5, '2026-07', 'Walked to the trailhead every morning with our dog. Tiny but perfect.'],
    ['Leo', 4, '2026-05', 'Lovely spot. The hot tub is small, as listed, so it really is for two.'],
  ],
  'dolomites-lake-boathouse': [
    ['Sophie', 5, '2026-09', 'Took the rowboat out at sunrise with the peaks mirrored in the water. Unforgettable.'],
    ['Lukas', 5, '2026-08', 'Once the day visitors leave, the lake is all yours.'],
    ['Amelia', 5, '2026-06', 'The fireplace kept the boathouse warm on a chilly night. Giulia was a great host.'],
  ],
  'snowy-lakeside-chalet': [
    ['Ryan', 5, '2026-02', 'Sauna, then a roll in the snow, then the hot tub. The kids loved the bunk room.'],
    ['Chloe', 4, '2026-01', 'Easy drive to the ski hill. Big enough for two families.'],
    ['Ben', 5, '2025-12', 'Watching the frozen lake from the fireplace was the best part of our trip.'],
  ],
  'misty-forest-cabin': [
    ['Ava', 5, '2026-09', 'I came to write and the desk by the window was perfect. Wifi was fast.'],
    ['Noah', 4, '2026-08', 'Truly no neighbors in sight. The wood stove heats the whole place.'],
    ['Grace', 5, '2026-05', 'River trail from the driveway, and our dog had the best week.'],
  ],
  'redwood-log-cabin': [
    ['Isabel', 5, '2026-08', 'Soaking in the porch hot tub under the redwoods felt unreal.'],
    ['Owen', 5, '2026-07', 'Quiet and romantic. Short drive to the river and the wineries.'],
    ['Maya', 4, '2026-04', 'Small, as expected for a one-room cabin, but the loft daybed worked for our friend.'],
  ],
  'lakeside-sauna-cabin': [
    ['Nils', 5, '2026-08', 'Sauna on the dock, then straight into the lake. We heard loons every evening.'],
    ['Kate', 5, '2026-07', 'Took the canoes out daily. Erik left great route notes.'],
    ['Sam', 5, '2026-06', 'Fire pit on the shore at night, total quiet. We will be back.'],
  ],
  'smoky-mountain-creek-cabin': [
    ['Tyler', 5, '2026-09', 'Falling asleep to the creek was the best. Hot tub views of the mountains too.'],
    ['Morgan', 4, '2026-07', 'Close to the park entrance and dog-friendly. Grill worked great.'],
    ['Abby', 5, '2026-05', 'Cozy for our family of five, with plenty of room on the porch.'],
  ],
  'overwater-beach-bungalow': [
    ['Lucas', 5, '2026-08', 'Stepping off the deck into the sea every morning never got old.'],
    ['Mia', 5, '2026-06', 'Hammocks, snorkeling right below the deck, and a quick water taxi to town.'],
    ['Diego', 4, '2026-03', 'Peaceful and beautiful. Bring a book, it is very quiet.'],
  ],
  'palm-lined-beach-house': [
    ['Rachel', 5, '2026-07', 'Room for our whole group, and the pool under the palms was a hit with the kids.'],
    ['Chris', 4, '2026-04', 'Easy walk to the beach and Duval Street. Lively area, as expected.'],
    ['Nina', 5, '2026-03', 'Loved the porches on both floors. Parking was a bonus in Old Town.'],
  ],
  'beachfront-casita-with-pool': [
    ['Pablo', 5, '2026-08', 'Biked to a cenote one morning and to the taquerias that night. Great base.'],
    ['Emma', 4, '2026-06', 'The pool is shared with the other casitas but never felt crowded.'],
    ['Zoe', 5, '2026-02', 'Short garden path to the beach. Our dog was welcome too.'],
  ],
  'haystack-view-beach-cottage': [
    ['Oliver', 5, '2026-09', 'Woke up to Haystack Rock from the living room. The stairs to the sand are right there.'],
    ['Lily', 5, '2026-07', 'Our dogs ran on the beach every day. Fireplace evenings were so cozy.'],
    ['Henry', 5, '2026-04', 'Easy beach walk into town for dinner. Quiet and beautiful.'],
  ],
  'outer-banks-dune-house': [
    ['Megan', 5, '2026-07', 'Twelve of us fit comfortably. The kids took over the bunk rooms.'],
    ['Jake', 4, '2026-06', 'Hot tub on the top deck with ocean views. Boardwalk to the beach is handy.'],
    ['Laura', 5, '2026-05', 'Grilled every night and charged our car right at the house.'],
  ],
  'algarve-dune-cottage': [
    ['Inês', 5, '2026-09', 'Sunsets from the terrace were incredible. The sandy path to the beach takes a minute.'],
    ['Tom', 5, '2026-07', 'Took a surf lesson at the beach below. Quiet cottage, lovely host.'],
    ['Clara', 5, '2026-05', 'Grilled fish on the terrace and watched the Atlantic. Simple and perfect.'],
  ],
  'byron-bay-surf-shack': [
    ['Josh', 5, '2026-08', 'Boards and wetsuits ready to go. Surfed every morning.'],
    ['Ella', 4, '2026-06', 'Tiny shack, but the outdoor shower and the walk to the beach make it.'],
    ['Max', 5, '2026-03', 'Walked to the lighthouse track at sunrise. Laid-back and lovely.'],
  ],
  'maui-stone-cottage': [
    ['Kiana', 5, '2026-09', 'Short walk to Baldwin Beach with the chairs and cooler provided.'],
    ['Ethan', 5, '2026-07', 'The lanai under the palms was our favorite spot. Peaceful.'],
    ['Ruby', 5, '2026-05', 'Quiet cottage, easy drive to Paia for dinner.'],
  ],
  'hillside-villa-with-pool': [
    ['Carlos', 5, '2026-08', 'Sea views from every bedroom, and the heated pool was perfect in the evening.'],
    ['Anna', 5, '2026-06', 'We booked the private chef for one night. Worth it.'],
    ['James', 5, '2026-04', 'I worked from the office for two days. Spacious for our group.'],
  ],
  'tropical-garden-villa': [
    ['Sarah', 5, '2026-08', 'Breakfast on our terrace every morning by the reflecting pool. Calm and beautiful.'],
    ['Dewi', 4, '2026-07', 'Each pavilion having its own bathroom made it easy for three couples.'],
    ['Paul', 5, '2026-04', 'Short drive to the beach clubs but it felt far from the noise.'],
  ],
  'infinity-pool-villa': [
    ['Alexis', 5, '2026-08', 'Sunsets from the terrace and the infinity pool were unreal.'],
    ['Mark', 5, '2026-07', 'Nikos met us at the port, which made arrival easy.'],
    ['Julia', 5, '2026-06', 'Quick drive to Little Venice for dinner. Gorgeous villa.'],
  ],
  'desert-modern-villa': [
    ['Dana', 5, '2026-03', 'Mountain views from the pool loungers and a spa to end the day.'],
    ['Kevin', 4, '2026-02', 'Our dogs loved the walled yard. Easy drive downtown.'],
    ['Tess', 5, '2025-11', 'Quiet, stylish, and the saltwater pool was spotless.'],
  ],
  'tuscan-brick-farmhouse': [
    ['Marco', 5, '2026-09', 'Long dinners on the shaded terrace looking over the olive groves.'],
    ['Helen', 5, '2026-07', 'The pool among the cypress trees was perfect after a day in Montepulciano.'],
    ['Will', 4, '2026-05', 'Beautiful farmhouse. Five-night minimum, but you will want to stay longer.'],
  ],
  'santorini-caldera-villa': [
    ['Lauren', 5, '2026-09', 'Hot tub on the terrace at sunset over the caldera. Pure magic.'],
    ['Andreas', 5, '2026-07', 'There are steps down to the villa, so we booked the porters. Easy.'],
    ['Mei', 5, '2026-06', 'Quiet and romantic. The terrace arches frame the view perfectly.'],
  ],
  'scottsdale-desert-pool-villa': [
    ['Brian', 5, '2026-03', 'Pool, hot tub and fire pit all facing the desert. The kids never left the patio.'],
    ['Alicia', 4, '2026-02', 'Lots of room for ten, and our dogs were welcome.'],
    ['Greg', 5, '2025-12', 'Mountain views from the patio and a great grill. Short drive to Old Town.'],
  ],
  'bright-brooklyn-loft': [
    ['Aisha', 5, '2026-09', 'The desk setup was great for a work trip. Sunny all day.'],
    ['Dylan', 4, '2026-08', 'Two blocks to the L train. Bedford Avenue has endless cafés.'],
    ['Nora', 5, '2026-06', 'Beautiful floors and tall windows. Quiet at night for Williamsburg.'],
  ],
  'sunny-alfama-apartment': [
    ['Tiago', 5, '2026-08', 'Opened the balconies to the tiled street every morning. Tram 28 is right there.'],
    ['Lucy', 5, '2026-06', 'Walked to the viewpoint for sunset and to fado bars after. Stairs are a workout.'],
    ['Felix', 4, '2026-04', 'Bright and comfortable. Our small dog was welcome.'],
  ],
  'plant-filled-studio': [
    ['Camila', 5, '2026-08', 'Calm little studio with coffee on the same block. Loved the plants.'],
    ['Adam', 5, '2026-07', 'Worked from the desk by the window all week. Quiet at night.'],
    ['Rosa', 5, '2026-05', 'Lovely tree-lined street in Roma Norte. Perfect for two.'],
  ],
  'paris-rooftop-apartment': [
    ['Claire', 5, '2026-09', 'Opening the windows to the rooftops and the Eiffel Tower every morning.'],
    ['Hugo', 5, '2026-07', 'Walked to Place des Vosges daily. The elevator is tiny but works.'],
    ['Emily', 4, '2026-05', 'Romantic and well located near the metro.'],
  ],
  'sunlit-shimokitazawa-apartment': [
    ['Yuki', 5, '2026-08', 'Sunny room and a short walk to the station. The pocket wifi was handy.'],
    ['Ian', 5, '2026-06', 'Shimokitazawa is full of vintage shops. Quiet apartment at night.'],
    ['Maria', 4, '2026-04', 'Our third guest slept on the futon and was comfortable.'],
  ],
  'west-loop-skyline-loft': [
    ['Derek', 5, '2026-08', 'Skyline views from the balcony and dinner on Randolph Street every night.'],
    ['Olivia', 5, '2026-06', 'Garage parking made driving in easy. Great desk setup.'],
    ['Sean', 4, '2026-04', 'Short walk to the train. Modern and spacious.'],
  ],
  'copenhagen-canal-apartment': [
    ['Freja', 5, '2026-08', 'Biked everywhere and swam in the harbor. The canal balcony is lovely.'],
    ['Alex', 5, '2026-07', 'Close to the metro and beautifully designed.'],
    ['Sara', 4, '2026-05', 'Cozy for four. Christianshavn is a great neighborhood.'],
  ],
}
