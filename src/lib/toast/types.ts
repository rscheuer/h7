export type PositionType = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type ToastStatus = 'default' | 'success' | 'error' | 'warning' | 'info' | 'dark' | string;

export interface ToastType {
	id: number;
	title: string;
	description: string;
	status: ToastStatus;
}

export interface ToastOptions {
	title?: string;
	status?: ToastStatus;
}
