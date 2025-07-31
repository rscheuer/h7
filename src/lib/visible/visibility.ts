import type { Action } from 'svelte/action';

interface VisibilityOptions {
	threshold?: number;
	once?: boolean;
}

interface VisibilityDetail {
	isVisible: boolean;
	scrollDirection: {
		vertical: 'up' | 'down' | null;
		horizontal: 'left' | 'right' | null;
	};
}

export interface VisibilityEvents {
	visibilitychange: CustomEvent<VisibilityDetail>;
}

export const visibility: Action<HTMLElement, VisibilityOptions, VisibilityEvents> = (
	node,
	options = {}
) => {
	let lastY = window.scrollY;
	let lastX = window.scrollX;

	const defaultOptions: VisibilityOptions = {
		threshold: 0.4,
		once: true
	};

	const finalOptions = { ...defaultOptions, ...options };

	const observer = new IntersectionObserver(
		(entries) => {
			const [entry] = entries;
			const isVisible = entry.isIntersecting;

			// Determine scroll direction
			const currentY = window.scrollY;
			const currentX = window.scrollX;

			const scrollDirection: VisibilityDetail['scrollDirection'] = {
				vertical: currentY > lastY ? ('down' as const) : currentY < lastY ? ('up' as const) : null,
				horizontal:
					currentX > lastX ? ('right' as const) : currentX < lastX ? ('left' as const) : null
			};

			lastY = currentY;
			lastX = currentX;

			// Dispatch custom event
			const detail: VisibilityDetail = {
				isVisible,
				scrollDirection
			};

			node.dispatchEvent(new CustomEvent('visibilitychange', { detail }));

			// If once is true and element is visible, disconnect the observer
			if (finalOptions.once && isVisible) {
				observer.disconnect();
			}
		},
		{
			threshold: finalOptions.threshold
		}
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		},
		update(newOptions: VisibilityOptions) {
			// Update options if they change
			Object.assign(finalOptions, newOptions);
		}
	};
};
