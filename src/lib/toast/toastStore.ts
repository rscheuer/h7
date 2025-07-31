import { writable } from 'svelte/store';
import type { PositionType, ToastOptions, ToastType } from './types';

export const toasts = writable<ToastType[]>([]);

export const position = writable<PositionType>('top-right');

export function toastsAdd(content: string, options?: ToastOptions) {
	const toast: ToastType = {
		id: new Date().valueOf() + Math.random(),
		title: options?.title ? options.title : '',
		description: content,
		status: options?.status ? options.status : 'default'
	};
	toasts.update((items) => {
		return [...items, toast];
	});
}

export function toastsRemove(id: number) {
	toasts.update((items) => {
		return items.filter((item) => item.id !== id);
	});
}

export function clearToasts() {
	toasts.set([]);
}

export const toast = {
	add: toastsAdd,
	remove: toastsRemove,
	clear: clearToasts
};
