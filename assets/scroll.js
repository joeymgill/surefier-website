(() => {
  const scroller = document.querySelector('main');
  const shell = document.querySelector('.scroll-shell');
  const thumb = document.querySelector('.scroll-indicator span');
  const sections = [...scroller.querySelectorAll(':scope > section')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pending = false;
  let hideTimer;
  function update() {
    pending = false;
    const bounds = scroller.getBoundingClientRect();
    const viewport = scroller.clientHeight;
    const track = Math.max(0, viewport - 24);
    const thumbHeight = Math.max(24, track * viewport / scroller.scrollHeight);
    const maximum = scroller.scrollHeight - viewport;
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${maximum > 0 ? (track - thumbHeight) * scroller.scrollTop / maximum : 0}px)`;
    for (const section of sections) {
      if (reducedMotion.matches) { section.style.removeProperty('opacity'); continue; }
      const rect = section.getBoundingClientRect();
      const visible = Math.max(0, Math.min(rect.bottom, bounds.bottom) - Math.max(rect.top, bounds.top));
      const coverage = visible / Math.min(rect.height, viewport);
      section.style.opacity = String(Math.max(0.12, Math.min(1, (coverage - 0.12) / 0.65)));
    }
  }
  function schedule() {
    if (!pending) { pending = true; requestAnimationFrame(update); }
  }
  function reveal(duration = 1100) {
    shell.classList.add('is-scrolling');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => shell.classList.remove('is-scrolling'), duration);
  }
  scroller.addEventListener('scroll', () => { reveal(); schedule(); }, {passive:true});
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', () => { reveal(1800); schedule(); });
  reducedMotion.addEventListener('change', schedule);
  // Anchor links scroll the content area, leaving the header stationary.
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      const top = target === scroller ? 0 : target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scroller.scrollTo({top, behavior:reducedMotion.matches ? 'instant' : 'smooth'});
      history.replaceState(null, '', `#${id}`);
      if (link.classList.contains('skip')) scroller.focus({preventScroll:true});
      reveal();
    });
  });
  new ResizeObserver(schedule).observe(scroller);
  update();
  reveal(1800);
})();

// Brief brand entrance; every element remains available without JavaScript.
(async () => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || location.hash && location.hash !== '#main') return;
  const logo = document.querySelector('header .logo');
  const overlay = logo.cloneNode();
  overlay.alt = '';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.className = 'intro-logo';
  // Match the header image's crop so the last animation frame is identical.
  overlay.style.objectFit = getComputedStyle(logo).objectFit;
  document.body.classList.add('is-entering');
  document.body.append(overlay);
  try {
    await logo.decode().catch(() => {});
    const target = logo.getBoundingClientRect();
    const width = Math.min(640, innerWidth * .78);
    const height = width * 1080 / 1920;
    Object.assign(overlay.style, {left:`${(innerWidth-width)/2}px`,top:`${(innerHeight-height)/2}px`,width:`${width}px`,height:`${height}px`});
    await overlay.animate([
      {opacity:0,transform:'scale(.96)'},
      {opacity:1,transform:'scale(1)'}
    ],{duration:350,fill:'forwards',easing:'ease-out'}).finished;
    await overlay.animate([
      {left:overlay.style.left,top:overlay.style.top,width:`${width}px`,height:`${height}px`,opacity:1},
      {left:`${target.left}px`,top:`${target.top}px`,width:`${target.width}px`,height:`${target.height}px`,opacity:1}
    ],{delay:400,duration:750,fill:'forwards',easing:'cubic-bezier(.65,0,.2,1)'}).finished;
    document.body.classList.add('logo-landed');
    // Paint the real logo beneath the clone before removing the overlay.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await overlay.animate([{opacity:1},{opacity:0}],{duration:140,fill:'forwards'}).finished;
    overlay.remove();
    document.body.classList.add('content-entering');
    const elements = [document.querySelector('header nav'),...document.querySelectorAll('.hero-copy>*'),document.querySelector('.construction')];
    const animations = elements.map((element,index) => element.animate([
      {opacity:0,transform:'translateY(10px)'},
      {opacity:1,transform:'translateY(0)'}
    ],{duration:450,delay:index*110,fill:'both',easing:'ease-out'}));
    await Promise.all(animations.map(animation => animation.finished));
    document.body.classList.remove('is-entering');
    animations.forEach(animation => animation.cancel());
  } finally {
    overlay.remove();
    document.body.classList.remove('is-entering');
  }
})().catch(() => {});
