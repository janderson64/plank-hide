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
    this.onFlyoutLayout = this.onFlyoutLayout.bind(this);
    window.addEventListener('scroll', this.onFlyoutLayout, { passive: true });
    window.addEventListener('resize', this.onFlyoutLayout);
    this.mainDetailsToggle.querySelector(':scope > .header__submenu')?.addEventListener('scroll', this.onFlyoutLayout, {
      passive: true,
    });
  }

  desktopHoverEnabled() {
    return this.desktopHoverQuery.matches;
  }

  bindDesktopHover(details) {
    const panel = details.querySelector(':scope > .header__submenu');
    if (panel) details._flyoutPanel = panel;

    details.addEventListener('mouseenter', () => this.openDetails(details));
    details.addEventListener('mouseleave', (event) => {
      if (panel?.contains(event.relatedTarget)) return;
      this.scheduleClose(details);
    });
    if (panel) {
      panel.addEventListener('mouseenter', () => this.openDetails(details));
      panel.addEventListener('mouseleave', (event) => {
        if (details.contains(event.relatedTarget) || panel.contains(event.relatedTarget)) return;
        this.scheduleClose(details);
      });
    }
    details.querySelector(':scope > summary')?.addEventListener('click', (event) => {
      if (!this.desktopHoverEnabled() || event.detail === 0) return;
      if (details.matches(':hover') && details.hasAttribute('open')) event.preventDefault();
    });
    if (details !== this.mainDetailsToggle) {
      details.addEventListener('toggle', () => {
        if (!this.desktopHoverEnabled()) {
          this.restoreFlyout(details);
          return;
        }
        if (details.open) this.placeFlyout(details);
        else this.restoreFlyout(details);
      });
    }
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
    if (details === this.mainDetailsToggle) this.fitFlyout(details);
    else this.placeFlyout(details);
  }

  scheduleClose(details) {
    if (!this.desktopHoverEnabled()) return;
    window.clearTimeout(this.closeTimers.get(details));
    this.closeTimers.set(
      details,
      window.setTimeout(() => {
        const summary = details.querySelector(':scope > summary');
        const panel = details._flyoutPanel;
        const active = document.activeElement;
        const focusedInside =
          active &&
          (details.contains(active) || panel?.contains(active)) &&
          active !== summary &&
          !summary?.contains(active);
        if (focusedInside) return;
        this.closeDetails(details);
      }, 150)
    );
  }

  closeDetails(details) {
    window.clearTimeout(this.closeTimers.get(details));
    details.querySelectorAll('details[open]').forEach((child) => this.closeDetails(child));
    this.restoreFlyout(details);
    details.removeAttribute('open');
    details.querySelector(':scope > summary')?.setAttribute('aria-expanded', 'false');
  }

  flyoutMaxHeight(top) {
    return `calc(100dvh - ${Math.max(top, 0)}px - 2rem)`;
  }

  fitFlyout(details) {
    if (!this.desktopHoverEnabled() || !details.open) return;
    const panel = details.querySelector(':scope > .header__submenu');
    if (!panel) return;
    panel.style.maxHeight = this.flyoutMaxHeight(panel.getBoundingClientRect().top);
  }

  placeFlyout(details) {
    if (!this.desktopHoverEnabled() || !details.open) return;
    const summary = details.querySelector(':scope > summary');
    const panel = details._flyoutPanel;
    if (!summary || !panel) return;

    const scroller = details.closest('.header__submenu');
    if (scroller) {
      const scrollerRect = scroller.getBoundingClientRect();
      const summaryRect = summary.getBoundingClientRect();
      if (summaryRect.bottom < scrollerRect.top || summaryRect.top > scrollerRect.bottom) {
        this.closeDetails(details);
        return;
      }
    }

    panel.dataset.flyoutFor = details.id;
    if (panel.parentElement !== this.mainDetailsToggle) this.mainDetailsToggle.appendChild(panel);
    panel.classList.add('header__submenu--floating');

    const rect = summary.getBoundingClientRect();
    panel.style.top = `${rect.top}px`;
    panel.style.left = `${rect.right - 6}px`;
    panel.style.maxHeight = this.flyoutMaxHeight(rect.top);
  }

  restoreFlyout(details) {
    const panel = details._flyoutPanel;
    if (!panel || panel.parentElement === details) {
      panel?.classList.remove('header__submenu--floating');
      return;
    }
    details.appendChild(panel);
    panel.classList.remove('header__submenu--floating');
    panel.style.top = '';
    panel.style.left = '';
    panel.style.maxHeight = '';
  }

  onFlyoutLayout() {
    if (!this.desktopHoverEnabled()) return;
    if (this.mainDetailsToggle.open) this.fitFlyout(this.mainDetailsToggle);
    this.querySelectorAll('.header__submenu details[open]').forEach((details) => this.placeFlyout(details));
  }

  onHeaderMenuKeydown(event) {
    if (event.key !== 'Escape') return;

    const floating = event.target.closest('.header__submenu--floating');
    if (floating?.dataset.flyoutFor) {
      const nested = document.getElementById(floating.dataset.flyoutFor);
      if (nested) {
        event.preventDefault();
        event.stopPropagation();
        this.closeDetails(nested);
        nested.querySelector('summary')?.focus();
        return;
      }
    }

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
    if (this.mainDetailsToggle.open) this.fitFlyout(this.mainDetailsToggle);
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
