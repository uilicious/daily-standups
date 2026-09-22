import foxSvg from '@/assets/avatars/fox.svg?raw';
import pandaSvg from '@/assets/avatars/panda.svg?raw';
import catSvg from '@/assets/avatars/cat.svg?raw';
import dogSvg from '@/assets/avatars/dog.svg?raw';
import bearSvg from '@/assets/avatars/bear.svg?raw';
import rabbitSvg from '@/assets/avatars/rabbit.svg?raw';
import lionSvg from '@/assets/avatars/lion.svg?raw';
import koalaSvg from '@/assets/avatars/koala.svg?raw';
import owlSvg from '@/assets/avatars/owl.svg?raw';
import penguinSvg from '@/assets/avatars/penguin.svg?raw';
import monkeySvg from '@/assets/avatars/monkey.svg?raw';
import tigerSvg from '@/assets/avatars/tiger.svg?raw';

export function svgToDataUrl(svgString) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

export const ANIMAL_AVATARS = [
  { id: 'fox', name: 'Fox', svg: foxSvg },
  { id: 'panda', name: 'Panda', svg: pandaSvg },
  { id: 'cat', name: 'Cat', svg: catSvg },
  { id: 'dog', name: 'Dog', svg: dogSvg },
  { id: 'bear', name: 'Bear', svg: bearSvg },
  { id: 'rabbit', name: 'Rabbit', svg: rabbitSvg },
  { id: 'lion', name: 'Lion', svg: lionSvg },
  { id: 'koala', name: 'Koala', svg: koalaSvg },
  { id: 'owl', name: 'Owl', svg: owlSvg },
  { id: 'penguin', name: 'Penguin', svg: penguinSvg },
  { id: 'monkey', name: 'Monkey', svg: monkeySvg },
  { id: 'tiger', name: 'Tiger', svg: tigerSvg }
].map(animal => ({
  ...animal,
  dataUrl: svgToDataUrl(animal.svg)
}));
