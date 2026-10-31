// Scene 5: Nikah details + "View location" button.

export function initNikah(scene, { mapUrl }) {
  const btn = scene.querySelector('.map-btn');
  btn.href = mapUrl;
  return { button: btn };
}
