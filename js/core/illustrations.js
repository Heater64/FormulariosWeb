/* ============================================================
   ILUSTRACIONES - conjunto acuarela tierra
   Uso: <div data-illustration="door"></div>
        o window.getIllustration('door')
   ============================================================ */

(function () {
    const C = {
        stroke: '#775336',
        fill1: '#E7D9C4',
        fill2: '#D8C3A4',
        fill3: '#C9B59C',
        accent: '#5F7A5A',
        deep: '#5E4128',
        sand: '#EDE6D9'
    };

    const I = {
        door: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="34" y="14" width="52" height="92" rx="6" fill="${C.fill1}" stroke="${C.stroke}" stroke-width="3"/>
            <rect x="44" y="24" width="32" height="72" rx="3" fill="${C.fill2}" stroke="${C.stroke}" stroke-width="2"/>
            <circle cx="70" cy="62" r="3.5" fill="${C.deep}"/>
            <path d="M34 106 H86" stroke="${C.stroke}" stroke-width="3" stroke-linecap="round"/>
            <path d="M40 96 q20 -10 40 0" stroke="${C.accent}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </svg>`,

        lamp: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M44 34 h32 l-6 30 h-20 z" fill="${C.fill1}" stroke="${C.stroke}" stroke-width="3" stroke-linejoin="round"/>
            <path d="M44 64 h32" stroke="${C.stroke}" stroke-width="3"/>
            <path d="M60 64 v22" stroke="${C.stroke}" stroke-width="3"/>
            <path d="M48 86 h24" stroke="${C.stroke}" stroke-width="3" stroke-linecap="round"/>
            <path d="M60 8 q14 10 0 22 q-14 -12 0 -22z" fill="${C.fill2}" stroke="${C.accent}" stroke-width="2"/>
        </svg>`,

        scroll: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M34 30 h44 a6 6 0 0 1 6 6 v44 a6 6 0 0 1 -6 6 h-44 a6 6 0 0 1 -6 -6 v-44 a6 6 0 0 1 6 -6z" fill="${C.fill1}" stroke="${C.stroke}" stroke-width="3"/>
            <path d="M86 36 v44 a6 6 0 0 1 -6 6" stroke="${C.stroke}" stroke-width="3" fill="none"/>
            <path d="M44 48 h30 M44 58 h30 M44 68 h20" stroke="${C.stroke}" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M30 26 h44 a6 6 0 0 1 6 6" stroke="${C.accent}" stroke-width="2.5" fill="none"/>
        </svg>`,

        mountain: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="86" cy="34" r="10" fill="${C.fill2}" stroke="${C.stroke}" stroke-width="2.5"/>
            <path d="M18 92 L46 50 L66 78 L78 60 L102 92 Z" fill="${C.fill1}" stroke="${C.stroke}" stroke-width="3" stroke-linejoin="round"/>
            <path d="M40 58 l6 -8 l8 12" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
            <path d="M18 96 H102" stroke="${C.stroke}" stroke-width="3" stroke-linecap="round"/>
        </svg>`,

        gear: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="60" cy="60" r="26" fill="${C.fill1}" stroke="${C.stroke}" stroke-width="3"/>
            <circle cx="60" cy="60" r="9" fill="#fff" stroke="${C.stroke}" stroke-width="3"/>
            <g stroke="${C.stroke}" stroke-width="3" stroke-linecap="round">
                <path d="M60 24v-8M60 104v-8M24 60h-8M104 60h-8M37 37l-6-6M89 89l-6-6M83 37l6-6M31 89l6-6"/>
            </g>
        </svg>`,

        book: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M60 30 C46 22 28 22 18 28 v60 c10 -6 28 -6 42 2 c14 -8 32 -8 42 -2 v-60 c-10 -6 -28 -6 -42 2z" fill="${C.fill1}" stroke="${C.stroke}" stroke-width="3" stroke-linejoin="round"/>
            <path d="M60 30 v62" stroke="${C.stroke}" stroke-width="3"/>
        </svg>`,

        olive: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M60 100 V40" stroke="${C.deep}" stroke-width="3" stroke-linecap="round"/>
            <path d="M60 56 C40 50 30 34 30 18 C50 22 60 38 60 56z" fill="${C.accent}" stroke="${C.stroke}" stroke-width="2.5"/>
            <path d="M60 64 C80 58 90 42 90 26 C70 30 60 46 60 64z" fill="${C.fill2}" stroke="${C.stroke}" stroke-width="2.5"/>
            <circle cx="60" cy="92" r="5" fill="${C.fill3}" stroke="${C.stroke}" stroke-width="2"/>
        </svg>`,

        map: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M28 30 L48 24 L72 30 L92 24 V92 L72 98 L48 92 L28 98 Z" fill="${C.fill1}" stroke="${C.stroke}" stroke-width="3" stroke-linejoin="round"/>
            <path d="M48 24 V92 M72 30 V98" stroke="${C.stroke}" stroke-width="2.5"/>
            <circle cx="60" cy="60" r="6" fill="${C.accent}" stroke="${C.stroke}" stroke-width="2"/>
        </svg>`,

        brain: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M44 34 c-14 0 -22 10 -22 22 c0 6 2 10 6 14 c-2 6 0 14 8 16 c4 6 14 6 18 0 c8 2 18 -2 18 -14 c8 -2 10 -14 -4 -18 c2 -10 -8 -20 -22 -20z" fill="${C.fill1}" stroke="${C.stroke}" stroke-width="3" stroke-linejoin="round"/>
            <path d="M60 40 v44 M48 52 h24 M48 66 h22" stroke="${C.stroke}" stroke-width="2.5" stroke-linecap="round"/>
        </svg>`,

        crown: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M30 78 L24 40 L44 56 L60 34 L76 56 L96 40 L90 78 Z" fill="${C.fill2}" stroke="${C.stroke}" stroke-width="3" stroke-linejoin="round"/>
            <rect x="28" y="80" width="64" height="10" rx="3" fill="${C.fill3}" stroke="${C.stroke}" stroke-width="3"/>
            <circle cx="60" cy="34" r="4" fill="${C.accent}"/>
        </svg>`,

        shield: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M60 22 L92 34 V62 C92 82 76 96 60 102 C44 96 28 82 28 62 V34 Z" fill="${C.fill1}" stroke="${C.stroke}" stroke-width="3" stroke-linejoin="round"/>
            <path d="M48 60 l9 9 l16 -18" stroke="${C.accent}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,

        clipboard: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="36" y="30" width="48" height="62" rx="6" fill="${C.fill1}" stroke="${C.stroke}" stroke-width="3"/>
            <rect x="48" y="22" width="24" height="14" rx="4" fill="${C.fill2}" stroke="${C.stroke}" stroke-width="3"/>
            <path d="M48 58 l8 8 l16 -18" stroke="${C.accent}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,

        fileEdit: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M40 26 h26 l18 18 v50 a4 4 0 0 1 -4 4 H40 a4 4 0 0 1 -4 -4 V30 a4 4 0 0 1 4 -4z" fill="${C.fill1}" stroke="${C.stroke}" stroke-width="3" stroke-linejoin="round"/>
            <path d="M66 44 h16 M50 60 h22 M50 70 h14" stroke="${C.stroke}" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M76 70 l10 10 l-16 4 l4 -16z" fill="${C.fill2}" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round"/>
        </svg>`,

        bell: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M44 84 a16 16 0 0 0 32 0z" fill="${C.fill2}" stroke="${C.stroke}" stroke-width="3" stroke-linejoin="round"/>
            <path d="M40 84 V56 a20 20 0 0 1 40 0 v28" fill="${C.fill1}" stroke="${C.stroke}" stroke-width="3"/>
            <path d="M60 36 v-4" stroke="${C.stroke}" stroke-width="3" stroke-linecap="round"/>
        </svg>`,

        user: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="60" cy="46" r="16" fill="${C.fill2}" stroke="${C.stroke}" stroke-width="3"/>
            <path d="M30 96 c0 -18 14 -28 30 -28 s30 10 30 28" fill="${C.fill1}" stroke="${C.stroke}" stroke-width="3" stroke-linejoin="round"/>
        </svg>`,

        branch: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M60 100 V44" stroke="${C.deep}" stroke-width="3" stroke-linecap="round"/>
            <path d="M60 58 C44 54 36 40 36 26 C52 30 60 42 60 58z" fill="${C.accent}" stroke="${C.stroke}" stroke-width="2.5"/>
            <path d="M60 66 C76 62 84 48 84 34 C68 38 60 50 60 66z" fill="${C.fill2}" stroke="${C.stroke}" stroke-width="2.5"/>
        </svg>`,

        spark: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M60 26 l8 26 l26 8 l-26 8 l-8 26 l-8 -26 l-26 -8 l26 -8z" fill="${C.fill2}" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round"/>
        </svg>`
    };

    window.getIllustration = function (name) {
        return I[name] || I.book;
    };

    window.renderIllustrations = function (root) {
        (root || document).querySelectorAll('[data-illustration]').forEach(function (el) {
            el.innerHTML = window.getIllustration(el.getAttribute('data-illustration'));
        });
    };

    document.addEventListener('DOMContentLoaded', function () {
        window.renderIllustrations(document);
    });
})();
