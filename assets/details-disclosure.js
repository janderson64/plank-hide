class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.content = this.mainDetailsToggle.querySelector('summary').nextElementSibling;

    this.mainDetailsToggle.addEventListener('focusout', this.onFocusOut.bind(this));
    this.mainDetailsToggle.addEventListener('toggle', this.onToggle.bind(this));
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.close();
    });
  }

  onToggle() {
    if (!this.animations) this.animations = this.content.getAnimations();

    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.animations.forEach((animation) => animation.play());
    } else {
      this.animations.forEach((animation) => animation.cancel());
    }
  }

  close() {
    this.mainDetailsToggle.removeAttribute('open');
    this.mainDetailsToggle.querySelector('summary').setAttribute('aria-expanded', false);
  }
}

customElements.define('details-disclosure', DetailsDisclosure);

class HeaderMenu extends DetailsDisclosure {
  constructor() {
    super();
    this.header = document.querySelector('.header-wrapper');
    this.desktopHoverQuery = window.matchMedia('(min-width: 990px) and (hover: hover)');
    this.closeTimers = new WeakMap();
    this.onHeaderMenuKeydown = this.onHeaderMenuKeydown.bind(this);

    this.bindDesktopHover(this.mainDetailsToggle);
    this.querySelectorAll('.header__submenu details').forEach((details) => this.bindDesktopHover(details));
    this.addEventListener('keydown', this.onHeaderMenuKeydown);
  }

  desktopHoverEnabled() {
    return this.desktopHoverQuery.matches;
  }

  bindDesktopHover(details) {
    details.addEventListener('mouseenter', () => this.openDetails(details));
    details.addEventListener('mouseleave', () => this.scheduleClose(details));
    details.querySelector(':scope > summary')?.addEventListener('click', (event) => {
      if (!this.desktopHoverEnabled() || event.detail === 0) return;
      if (details.matches(':hover') && details.hasAttribute('open')) event.preventDefault();
    });
  }

  openDetails(details) {
    if (!this.desktopHoverEnabled()) return;
    window.clearTimeout(this.closeTimers.get(details));

    if (details === this.mainDetailsToggle) {
      this.closest('.list-menu--inline')
        ?.querySelectorAll(':scope > li > header-menu')
        .forEach((menu) => {
          if (menu !== this) menu.close?.();
        });
    } else {
      details.parentElement?.parentElement
        ?.querySelectorAll(':scope > li > details[open]')
        .forEach((other) => {
          if (other !== details) this.closeDetails(other);
        });
    }

    details.setAttribute('open', '');
    details.querySelector(':scope > summary')?.setAttribute('aria-expanded', 'true');
  }

  scheduleClose(details) {
    if (!this.desktopHoverEnabled()) return;
    window.clearTimeout(this.closeTimers.get(details));
    this.closeTimers.set(
      details,
      window.setTimeout(() => {
        const summary = details.querySelector(':scope > summary');
        const active = document.activeElement;
        if (details.contains(active) && active !== summary && !summary?.contains(active)) return;
        this.closeDetails(details);
      }, 150)
    );
  }

  closeDetails(details) {
    window.clearTimeout(this.closeTimers.get(details));
    details.removeAttribute('open');
    details.querySelector(':scope > summary')?.setAttribute('aria-expanded', 'false');
    details.querySelectorAll('details[open]').forEach((child) => {
      child.removeAttribute('open');
      child.querySelector(':scope > summary')?.setAttribute('aria-expanded', 'false');
    });
  }

  onHeaderMenuKeydown(event) {
    if (event.key !== 'Escape') return;

    const nested = event.target.closest('.header__submenu details[open]');
    if (nested) {
      event.preventDefault();
      event.stopPropagation();
      this.closeDetails(nested);
      nested.querySelector('summary')?.focus();
      return;
    }

    if (!this.mainDetailsToggle.hasAttribute('open')) return;
    event.preventDefault();
    this.close();
    this.mainDetailsToggle.querySelector('summary')?.focus();
  }

  close() {
    this.closeDetails(this.mainDetailsToggle);
  }

  onToggle() {
    if (!this.header) return;
    this.header.preventHide = this.mainDetailsToggle.open;

    if (document.documentElement.style.getPropertyValue('--header-bottom-position-desktop') !== '') return;
    document.documentElement.style.setProperty(
      '--header-bottom-position-desktop',
      `${Math.floor(this.header.getBoundingClientRect().bottom)}px`
    );
  }
}

customElements.define('header-menu', HeaderMenu);
