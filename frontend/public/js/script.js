const wrap = document.getElementById('headerWrap');
    const onScroll = () => wrap.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const burger = document.getElementById('hamburger');
    const menu = document.getElementById('mobileMenu');
    const toggleMenu = (open) => {
      const isOpen = open ?? !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', isOpen);
      burger.classList.toggle('is-open', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
      burger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    };
    burger.addEventListener('click', () => toggleMenu());
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
    window.addEventListener('resize', () => { if (window.innerWidth > 768) toggleMenu(false); });