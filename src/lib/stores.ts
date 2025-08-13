import { writable } from 'svelte/store';

export enum FlowPhase {
	Bootup = 'bootup',
	Webcam = 'webcam',
	Editor = 'editor',
	Test = 'test'
}

export const flowStore = writable<FlowPhase>(FlowPhase.Webcam);
