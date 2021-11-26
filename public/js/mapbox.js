/* eslint-disable */
const locations = JSON.parse(document.getElementById('map').dataset.locations); // map is the css id we specified, whatever we put in data attribute lik data-locations(in tour.pug file) and will be called dataset.locations because it is uses as data/locations or data-locations
console.log(locations);

mapboxgl.accessToken =
  'pk.eyJ1IjoiaW5kb2xlbnR0cm91dCIsImEiOiJja3dmYjY1dncwMHc0Mm5tbHBweXQ5aGRoIn0.AFnMsS7IRziusCYl-5pTiA';

const map = new mapboxgl.Map({
  container: 'map', // container ID // that's why we created map file in pug with 'map' id
  style: 'mapbox://styles/indolenttrout/ckwfbt3m75ye915odzla0wcwh',
  scrollZoom: false,
});

const bounds = new mapboxgl.LngLatBounds();
locations.forEach((loc) => {
  // Create marker
  const el = document.createElement('div');
  el.className = 'marker';

  // Add marker
  new mapboxgl.Marker({
    element: el,
    anchor: 'bottom', // means bottom of the pin will be located at exact GPS
  })
    .setLngLat(loc.coordinates)
    .addTo(map);

  // Add popup
  new mapboxgl.Popup({
    offset: 30,
  })
    .setLngLat(loc.coordinates)
    .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
    .addTo(map);

  // Extend map bounds to include current location
  bounds.extend(loc.coordinates);
});

map.fitBounds(bounds, {
  padding: {
    top: 200,
    bottom: 150,
    left: 100,
    right: 100,
  },
});
