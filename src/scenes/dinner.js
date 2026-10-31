// Scene 6: Dinner + "View location" button for the residence.

export function initDinner(scene, { mapUrl }) {
  const btn = scene.querySelector('.map-btn');
  btn.href = mapUrl;
  return { button: btn };
}
