export type PaletteKey = 'basic' | 'svg';

export const defaultPalettes = {
	svg: [
		'/halftone/svg/square-full.svg',
		'/halftone/svg/square-m.svg',
		'/halftone/svg/squares.svg',
		'/halftone/svg/circle-full.svg',
		'/halftone/svg/circle-m.svg',
		'/halftone/svg/circle-s.svg',
		'/halftone/svg/square-blue.svg',
		'/halftone/svg/star.svg',
		'/halftone/svg/triangle.svg',
		'/halftone/svg/candle-l.svg',
		'/halftone/svg/candle-m.svg',
		'/halftone/svg/candle-s.svg',
		'/halftone/svg/candle-xs.svg',
		'/halftone/svg/skew-l.svg',
		'/halftone/svg/skew-m.svg',
		'/halftone/svg/skew-s.svg',
		'/halftone/svg/skew-xs.svg',
		'/halftone/svg/square-minus-circle.svg',
		'/halftone/svg/plus.svg',
		'/halftone/svg/blank.svg',
		'/halftone/svg2/skew-invert-l.svg',
		'/halftone/svg2/skew-invert-m.svg',
		'/halftone/svg2/skew-invert-s.svg',
		'/halftone/svg2/skew-invert-xs.svg'

		// ... add more SVG files as needed
	],
	basic: []
} as const;
