export function tooltip(element: HTMLElement, options: any) {
	// tooltip svelte action

	let content = options.content;

	const { offsetTop, offsetLeft, offsetWidth } = element;

	// create tooltip Element
	const tooltip = document.createElement('div');
	tooltip.className = 'tooltip';
	tooltip.innerHTML = options.content;
	tooltip.style.position = 'absolute';
	tooltip.style.top = `${offsetTop}px`;
	tooltip.style.left = `${offsetLeft + offsetWidth / 2}px`;
	tooltip.style.zIndex = '9999';
	tooltip.style.pointerEvents = 'none';
	tooltip.style.opacity = '0';
	tooltip.style.transition = 'all 0.3s ease-in-out';
	tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
	tooltip.style.color = '#fff';
	tooltip.style.borderRadius = '0.25rem';
	tooltip.style.fontSize = '0.75rem';
	tooltip.style.fontWeight = '400';
	tooltip.style.padding = '0.5rem 1rem';
	tooltip.style.lineHeight = '1.25rem';
	tooltip.style.width = 'fit-content';
	tooltip.style.maxWidth = '200px';
	tooltip.style.textAlign = 'center';
	tooltip.style.boxShadow = '0 0.5rem 1rem rgba(0, 0, 0, 0.15)';
	tooltip.style.transform = 'translate(-50%, calc(-100% - 0.5rem))';
	tooltip.style.transformOrigin = 'center';
	tooltip.style.willChange = 'transform, opacity';
	tooltip.style.userSelect = 'none';

	// add tooltip to DOM
	// element.appendChild(tooltip);

	// append to document
	document.body.appendChild(tooltip);

	element.addEventListener('mouseenter', () => {
		if (content.length <= 0) return;
		tooltip.style.opacity = '1';
		tooltip.style.transform = 'translate(-50%, calc(-100% - 0.3rem))';
	});

	element.addEventListener('mouseleave', () => {
		tooltip.style.opacity = '0';
		tooltip.style.transform = 'translate(-50%, calc(-100% - 0.5rem))';
	});

	// add resize listener
	window.addEventListener('resize', () => {
		const { offsetTop, offsetLeft, offsetWidth } = element;
		tooltip.style.left = `${offsetLeft + offsetWidth / 2}px`;
		tooltip.style.top = `${offsetTop}px`;
	});

	return {
		update(options: any) {
			content = options.content;
			tooltip.innerHTML = options.content;
		},
		destroy() {
			// cleanup
			tooltip.remove();
		}
	};
}
