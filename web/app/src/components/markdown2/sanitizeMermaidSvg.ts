const SAFE_URL_PATTERN = /^(?:https?:|mailto:|tel:|#|\/)/i;
const BLOCKED_ELEMENTS = new Set(['script', 'iframe', 'object', 'embed']);

const isSafeUrl = (value: string) => {
  const normalized = value.trim().replace(/[\u0000-\u001F\u007F\s]+/g, '');
  if (!normalized || normalized.startsWith('#')) return true;
  return SAFE_URL_PATTERN.test(normalized);
};

export const sanitizeMermaidSvg = (svg: string): string => {
  if (!svg || typeof DOMParser === 'undefined') return '';

  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (document.querySelector('parsererror')) return '';

  const root = document.documentElement;
  if (root.localName.toLowerCase() !== 'svg') return '';

  [root, ...Array.from(root.querySelectorAll('*'))].forEach(element => {
    if (
      element !== root &&
      BLOCKED_ELEMENTS.has(element.localName.toLowerCase())
    ) {
      element.remove();
      return;
    }

    Array.from(element.attributes).forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();

      if (name.startsWith('on') || name === 'href' || name === 'xlink:href') {
        if (name.startsWith('on') || !isSafeUrl(value)) {
          element.removeAttribute(attribute.name);
        }
      }
    });
  });

  return new XMLSerializer().serializeToString(root);
};
