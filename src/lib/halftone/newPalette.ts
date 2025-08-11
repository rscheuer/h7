export type Tile = {
	svg: string;
	png: string;
	color: string;
	colorMode?: 'default' | 'custom' | 'source';
};

export type PaletteType = {
	key: string;
	tiles: Tile[];
};

export type PaletteKey = 'basic' | 'svg';

const TileKeys = {
	squareFull: 'square-full',
	squareM: 'square-m',
	squareMinusCircle: 'square-minus-circle',
	squares: 'squares',
	circleFull: 'circle-full',
	circleM: 'circle-m',
	candleL: 'candle-l',
	candleM: 'candle-m',
	candleS: 'candle-s',
	candleXs: 'candle-xs',
	blank: 'blank',
	checker: 'checker',
	diamondM: 'diamond-m',
	diamondS: 'diamond-s',
	lineHl: 'line-h-l',
	lineHm: 'line-h-m',
	lineHs: 'line-h-s',
	plus: 'plus',
	squareHollow: 'square-hollow',
	circle1: 'circle-1',
	circle2: 'circle-2',
	circle4: 'circle-4',
	circle8: 'circle-8',
	roundedCircle: 'rounded-circle',
	roundedSquare: 'rounded-square',
	roundedSquareS: 'rounded-square-s',
	roundedHole: 'rounded-hole',
	roundedStar: 'rounded-star',
	roundedChecker: 'rounded-checker'
};

function getTile(key: keyof typeof TileKeys | string, color?: string) {
	return {
		svg: `/halftone/svg/${key}.svg`,
		png: `/halftone/png/${key}.png`,
		color: color || '#000000'
	};
}

export const masterList = [
	{
		svg: '/halftone/svg/square-full.svg',
		png: '/halftone/png/square-full.png'
	},
	{
		svg: '/halftone/svg/square-m.svg',
		png: '/halftone/png/square-m.png'
	},
	{
		svg: '/halftone/svg/square-minus-circle.svg',
		png: '/halftone/png/square-minus-circle.png'
	},
	{
		svg: '/halftone/svg/squares.svg',
		png: '/halftone/png/squares.png'
	},
	{
		svg: '/halftone/svg/circle-full.svg',
		png: '/halftone/png/circle-full.png'
	},
	{
		svg: '/halftone/svg/circle-m.svg',
		png: '/halftone/png/circle-m.png'
	},
	{
		svg: '/halftone/svg/candle-l.svg',
		png: '/halftone/png/candle-l.png'
	},
	{
		svg: '/halftone/svg/candle-m.svg',
		png: '/halftone/png/candle-m.png'
	},
	{
		svg: '/halftone/svg/candle-s.svg',
		png: '/halftone/png/candle-s.png'
	},
	{
		svg: '/halftone/svg/candle-xs.svg',
		png: '/halftone/png/candle-xs.png'
	},
	{
		svg: '/halftone/svg/skew-l.svg',
		png: '/halftone/png/skew-l.png'
	},
	{
		svg: '/halftone/svg/skew-m.svg',
		png: '/halftone/png/skew-m.png'
	},
	{
		svg: '/halftone/svg/skew-s.svg',
		png: '/halftone/png/skew-s.png'
	},
	{
		svg: '/halftone/svg/skew-xs.svg',
		png: '/halftone/png/skew-xs.png'
	},
	{
		svg: '/halftone/svg/blank.svg',
		png: '/halftone/png/blank.png'
	},
	// selects
	{
		svg: '/halftone/svg/checker.svg'
	},
	{
		svg: '/halftone/svg/diamond-m.svg'
	},
	{
		svg: '/halftone/svg/diamond-s.svg'
	},
	{
		svg: '/halftone/svg/line-h-l.svg'
	},
	{
		svg: '/halftone/svg/line-h-m.svg'
	},
	{
		svg: '/halftone/svg/line-h-s.svg'
	},
	{
		svg: '/halftone/svg/plus.svg'
	},
	{
		svg: '/halftone/svg/square-hollow.svg'
	}
];

const johnPalette = {
	key: 'default',
	tiles: [
		{
			svg: '/halftone/svg/square-m.svg',
			png: '/halftone/png/square-m.png',
			color: '#162FEB'
		},
		{
			svg: '/halftone/svg/square-m.svg',
			png: '/halftone/png/square-m.png',
			color: '#99066A'
		},
		{
			svg: '/halftone/svg/square-minus-circle.svg',
			png: '/halftone/png/square-minus-circle.png',
			color: '#355C05'
		},
		{
			svg: '/halftone/svg/squares.svg',
			png: '/halftone/png/squares.png',
			color: '#1E9F0E'
		},
		{
			svg: '/halftone/svg/circle-full.svg',
			png: '/halftone/png/circle-full.png',
			color: '#D6BD05'
		},
		{
			svg: '/halftone/svg/circle-full.svg',
			png: '/halftone/png/circle-full.png',
			color: '#FF5400'
		},
		{
			svg: '/halftone/svg/circle-m.svg',
			png: '/halftone/png/circle-m.png',
			color: '#FF0005'
		},
		{
			svg: '/halftone/svg/circle-m.svg',
			png: '/halftone/png/circle-m.png',
			color: '#FF00E3'
		}
	]
};

const jonPalette = {
	key: 'jon',
	tiles: [
		getTile(TileKeys.squareM, '#162FEB'),
		getTile(TileKeys.squareM, '#99066A'),
		getTile(TileKeys.squareMinusCircle, '#355C05'),
		getTile(TileKeys.squares, '#1E9F0E'),
		getTile(TileKeys.circleFull, '#D6BD05'),
		getTile(TileKeys.circleFull, '#FF5400'),
		getTile(TileKeys.circleM, '#FF0005'),
		getTile(TileKeys.circleM, '#FF00E3'),
		getTile(TileKeys.blank, '#000000')
	]
};

const circlePalette = {
	key: 'circle',
	tiles: [
		getTile(TileKeys.circle8, '#F09A37'),
		getTile(TileKeys.circle8, '#E1CF63'),
		getTile(TileKeys.circle4, '#9FB8BB'),
		getTile(TileKeys.circle2, '#625A7C'),
		getTile(TileKeys.circle1, '#545654')
	]
};

const roundedPalette = {
	key: 'rounded',
	tiles: [
		getTile(TileKeys.roundedSquare, '#E1CF63'),
		getTile(TileKeys.roundedHole, '#9FB8BB'),
		getTile(TileKeys.roundedCircle, '#F09A37'),
		getTile(TileKeys.circleM, '#E1CF63'),
		getTile(TileKeys.roundedSquareS, '#22CF63'),
		getTile(TileKeys.roundedStar, '#625A7C'),
		getTile(TileKeys.roundedChecker, '#545654'),
		getTile(TileKeys.blank, '#000000')
	]
};

const roundedPaletteMono = {
	key: 'rounded',
	tiles: [
		getTile(TileKeys.roundedSquare, '#625A7C'),
		getTile(TileKeys.roundedHole, '#625A7C'),
		getTile(TileKeys.roundedCircle, '#625A7C'),
		getTile(TileKeys.roundedStar, '#625A7C'),
		getTile(TileKeys.roundedChecker, '#625A7C'),
		getTile(TileKeys.circleM, '#625A7C'),
		getTile(TileKeys.roundedSquareS, '#625A7C'),
		getTile(TileKeys.blank, '#000000')
	]
};

const circleScalePalette = {
	key: 'circle',
	tiles: [
		getTile(TileKeys.circle1, '#F09A37'),
		getTile(TileKeys.circle1, '#E1CF63'),
		getTile(TileKeys.circle1, '#9FB8BB'),
		getTile(TileKeys.circle1, '#625A7C'),
		getTile(TileKeys.circle1, '#545654')
	]
};

const basePalette = {
	key: 'base',
	tiles: [
		getTile(TileKeys.squareFull, '#0000ff'),
		getTile(TileKeys.squareM, '#66C800'),
		getTile(TileKeys.squareMinusCircle, '#3C8AFF'),
		getTile(TileKeys.circleFull, '#B8A581'),
		getTile(TileKeys.circleFull, '#FFD12F'),
		getTile(TileKeys.squares, '#B8A581'),
		getTile(TileKeys.circleM, '#FEA8CD'),
		getTile(TileKeys.circleM, '#B6F569'),
		getTile(TileKeys.blank, '#000000')
	]
};

const basePaletteSelects = {
	key: 'base',
	tiles: [
		getTile(TileKeys.squareHollow, '#0000ff'),
		getTile(TileKeys.checker, '#3C8AFF'),
		getTile(TileKeys.diamondM, '#66C800'),
		getTile(TileKeys.diamondS, '#B8A581'),
		getTile(TileKeys.lineHm, '#FFD12F'),
		getTile(TileKeys.lineHs, '#FEA8CD'),
		getTile(TileKeys.plus, '#B6F569'),
		getTile(TileKeys.blank, '#000000')
	]
};

const twoColorPalette = {
	key: 'twoColor',
	tiles: [getTile(TileKeys.squareHollow, '#0000ff'), getTile(TileKeys.blank, '#66C800')]
};

const threeColorPalette = {
	key: 'threeColor',
	tiles: [
		getTile(TileKeys.checker, '#0000ff'),
		getTile(TileKeys.diamondM, '#66C800'),
		getTile(TileKeys.blank, '#3C8AFF')
	]
};

const baseCandlePalette = {
	key: 'baseCandle',
	tiles: [
		getTile(TileKeys.candleL, '#000000'),
		getTile(TileKeys.candleM, '#000000'),
		getTile(TileKeys.candleS, '#000000'),
		getTile(TileKeys.candleXs, '#000000')
	]
};

const baseCandlePaletteBlank = {
	key: 'baseCandle',
	tiles: [
		getTile(TileKeys.candleL, '#000000'),
		getTile(TileKeys.candleM, '#000000'),
		getTile(TileKeys.candleS, '#000000'),
		getTile(TileKeys.candleXs, '#000000'),
		getTile(TileKeys.blank, '#000000')
	]
};

const baseColorCandlePalette = {
	key: 'baseCandle',
	tiles: [
		getTile(TileKeys.candleL, '#66C800'),
		getTile(TileKeys.candleM, '#FC401F'),
		getTile(TileKeys.candleS, '#000000'),
		getTile(TileKeys.candleXs, '#000000')
	]
};

const britpopPalette = {
	key: 'britpop',
	tiles: [
		getTile(TileKeys.checker, '#DEE1E7'),
		getTile(TileKeys.diamondM, '#B6F569'),
		getTile(TileKeys.plus, '#66C800'),
		getTile(TileKeys.lineHm, '#FEA8CD'),
		getTile(TileKeys.blank, '#000000')
	]
};

export const colorPalettesList = [
	{
		key: 'baseColor',
		colors: ['#FC401F', '#B8A581', '#FEA8CD', '#32353D', '#B1B7C3']
	},
	{
		key: 'britpop',
		colors: ['#DEE1E7', '#B6F569', '#66C800', '#FEA8CD']
	},
	{
		key: 'core',
		colors: ['#0000ff', '#DEE1E7', '#717886', '#0A0B0D']
	},
	{
		key: 'builders',
		colors: ['#5B616E', '#3C8AFF', '#66C800', '#EEF0F3']
	}
];

export const colorPalettes = [
	{
		key: 'default',
		colors: ['#E1CF63', '#9FB8BB', '#F09A37', '#E1CF63', '#22CF63', '#625A7C', '#545654', '#000000']
	},
	{
		key: 'heatmap',
		colors: ['#FF00E3', '#FF0005', '#FF5400', '#D6BD05', '#22CF63', '#1E9F0E', '#162FEB', '#000000']
	},
	{
		key: 'heatmap2',
		colors: ['#FF00E3', '#cc0d0d', '#9e5d12', '#0e914b', '#125b41', '#0f67a9', '#8a898a', '#000000']
	},
	{
		key: 'chart',
		colors: ['#e7e7da', '#d4ce22', '#ca2d14', '#999881', '#215f14', '#605138', '#2e2b1c', '#000000']
	}
];

export const newPalettes: PaletteType[] = [
	// basePalette,
	// basePaletteSelects,
	// baseCandlePalette,
	// baseCandlePaletteBlank,
	// twoColorPalette,
	// threeColorPalette,
	// jonPalette,
	// baseColorCandlePalette,
	// britpopPalette,
	// circlePalette,
	// circleScalePalette,
	roundedPalette,
	roundedPaletteMono
] as const;
