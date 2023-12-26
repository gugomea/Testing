window.addEventListener('load', function () {

	const container = document.getElementById('main-container');
    const center = document.getElementById('center');
    const left = document.getElementById('left');
	let moving = false;

	document.addEventListener('mouseup', _ => {
		moving = false;
		document.body.style.cursor = 'default';
	});
	center.addEventListener('mousedown', _ => moving = true);

	document.addEventListener('mousemove', e => {
		if(!moving) return;
		document.getSelection().empty();//para que no se seleccione el texto cuando nos movemos rápido.
		document.body.style.cursor = 'ew-resize';
		const rec = container.getBoundingClientRect();
        const dx = Math.max(100, e.clientX - rec.x);
        const newLeftWidth = (dx / rec.width) * 100
        left.style.width = newLeftWidth + '%';
	});
});
