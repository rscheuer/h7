import { writable } from 'svelte/store';

// make a type for 4 string options
type ToastStatus = 'default' | 'success' | 'error' | 'warning' | 'info' | 'dark' | string;

interface ToastType {
	id: number;
	title: string;
	description: string;
	status: ToastStatus;
}

interface ToastOptions {
	title?: string;
	status?: ToastStatus;
}

export const toasts = writable<ToastType[]>([]);

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
