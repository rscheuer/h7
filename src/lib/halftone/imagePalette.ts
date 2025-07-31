export type PaletteKey = 'basic' | 'svg';

export const defaultPalettes = {
	basic: [
		// ... your existing basic palette
		'/halftone/basic/blue-square.png',
		'/halftone/basic/circle.png',
		'/halftone/basic/squares.png',
		'/halftone/basic/dot-large.png',
		'/halftone/basic/dot-semibold.png',
		'/halftone/basic/dot-medium.png',
		'/halftone/basic/dot-small.png'
	]
} as const;
