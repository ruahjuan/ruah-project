/**
 * prayers.js — FIAT
 * Responsabilidad única: datos y renderizado de las oraciones.
 * Sin dependencias externas. Sin acceso a state.js.
 */

const PRAYERS = [
  {
    id: 'letanias',
    label: 'Letanías de la Humildad',
    title: 'Letanías de la Humildad',
    subtitle: 'Cardenal Rafael Merry del Val',
    body: `<p>Jesús manso y humilde de Corazón, <em>óyeme.</em></p>
<p style="font-style:italic;color:var(--muted);font-size:13px">(Después de cada frase: <strong>Líbrame, Jesús.</strong>)</p>
<div class="litany-item">Del deseo de ser lisonjeado,</div>
<div class="litany-item">Del deseo de ser alabado,</div>
<div class="litany-item">Del deseo de ser honrado,</div>
<div class="litany-item">Del deseo de ser aplaudido,</div>
<div class="litany-item">Del deseo de ser preferido a otros,</div>
<div class="litany-item">Del deseo de ser consultado,</div>
<div class="litany-item">Del deseo de ser aceptado,</div>
<div class="litany-item">Del temor de ser humillado,</div>
<div class="litany-item">Del temor de ser despreciado,</div>
<div class="litany-item">Del temor de ser reprendido,</div>
<div class="litany-item">Del temor de ser calumniado,</div>
<div class="litany-item">Del temor de ser olvidado,</div>
<div class="litany-item">Del temor de ser puesto en ridículo,</div>
<div class="litany-item">Del temor de ser injuriado,</div>
<div class="litany-item">Del temor de ser juzgado con malicia,</div>
<p style="font-style:italic;color:var(--muted);font-size:13px;margin:14px 0 8px">(Después de cada frase: <strong>Jesús, dame la gracia de desearlo.</strong>)</p>
<div class="litany-item">Que otros sean más amados que yo,</div>
<div class="litany-item">Que otros sean más estimados que yo,</div>
<div class="litany-item">Que otros crezcan en la opinión del mundo y yo me eclipse,</div>
<div class="litany-item">Que otros sean alabados y de mí no se haga caso,</div>
<div class="litany-item">Que otros sean empleados en cargos y a mí se me juzgue inútil,</div>
<div class="litany-item">Que los demás sean más santos que yo, con tal que yo sea todo lo santo que pueda.</div>
<p style="margin-top:14px;font-size:13px"><em>Oh Jesús, que siendo Dios te humillaste hasta la muerte de Cruz, concédenos la gracia de aprender y practicar tu ejemplo. Amén.</em></p>`
  },
  {
    id: 'generosidad',
    label: 'Por la generosidad',
    title: 'Oración para la generosidad',
    subtitle: 'San Ignacio de Loyola',
    body: `<p>Señor, enséñame a ser generoso.</p>
<p>Enséñame a servirte como te mereces; a dar, y no contar el costo, a luchar, y no prestar atención a las heridas, a esforzarme, y no buscar descanso, a trabajar, y no pedir recompensa, excepto la de saber que estamos haciendo Tu voluntad.</p>
<p><em>Amén.</em></p>`
  },
  {
    id: 'abandono',
    label: 'De abandono',
    title: 'Oración de abandono',
    subtitle: 'San Charles de Foucauld',
    body: `<p>Padre, me pongo en tus manos, haz de mí lo que quieras, sea lo que sea, te doy las gracias.</p>
<p>Estoy dispuesto a todo, lo acepto todo, con tal de que tu voluntad se cumpla en mí, y en todas tus criaturas. No deseo nada más, Padre.</p>
<p>Te confío mi alma, te la doy con todo el amor de que soy capaz, porque te amo. Y necesito darme, ponerme en tus manos sin medida, con una infinita confianza, porque Tú eres mi Padre.</p>
<p><em>Amén.</em></p>`
  },
  {
    id: 'espiritu',
    label: 'Ven, Espíritu Santo',
    title: 'Ven Espíritu Santo',
    body: `<p>Ven, Espíritu divino, manda tu luz desde el cielo.<br>Padre amoroso del pobre; don, en tus dones espléndido;<br>luz que penetra las almas; fuente del mayor consuelo.</p>
<p>Ven, dulce huésped del alma, descanso de nuestro esfuerzo,<br>tregua en el duro trabajo, brisa en las horas de fuego,<br>gozo que enjuga las lágrimas y reconforta en los duelos.</p>
<p>Entra hasta el fondo del alma, divina luz, y enriquécenos.<br>Mira el vacío del hombre, si tú le faltas por dentro;<br>mira el poder del pecado, cuando no envías tu aliento.</p>
<p>Riega la tierra en sequía, sana el corazón enfermo,<br>lava las manchas, infunde calor de vida en el hielo,<br>doma el espíritu indómito, guía al que tuerce el sendero.</p>
<p>Reparte tus siete dones, según la fe de tus siervos;<br>por tu bondad y tu gracia, dale al esfuerzo su mérito;<br>salva al que busca salvarse y danos tu gozo eterno.</p>
<p><em>Amén.</em></p>`
  },
  {
    id: 'cecilia-corta',
    label: 'A Santa Cecilia (breve)',
    title: 'Oración corta a Santa Cecilia',
    subtitle: 'Patrona de los músicos',
    body: `<p>Oh santa Cecilia, patrona amada de los músicos, vengo a ti con humildad y gratitud.</p>
<p>Te pido que intercedas por los músicos y nos brindes tu protección y bendiciones en nuestra búsqueda musical.</p>
<p>Inspíranos con tu gracia para que podamos expresar la belleza a través de la música y superar los desafíos que puedan surgir en nuestro camino.</p>
<p>Agradezco tu guía y amor.</p>
<p><em>Amén.</em></p>`
  },
  {
    id: 'cecilia',
    label: 'A Santa Cecilia',
    title: 'Oración a Santa Cecilia',
    subtitle: 'Patrona de los músicos',
    body: `<p>Oh Santa Cecilia, patrona amada de los músicos, escucha nuestras súplicas en este momento de inspiración y creación.</p>
<p>Tú, que en tu martirio elevaste tu voz en canción divina, guía nuestras manos y nuestros corazones mientras exploramos las melodías del mundo.</p>
<p>Encomendamos a ti, Santa Cecilia, nuestras partituras y nuestras interpretaciones. Concédenos la gracia de transmitir la belleza y la armonía que residen en la esencia de la música.</p>
<p>Que nuestras composiciones reflejen la luz divina que iluminó tu camino en los momentos más oscuros.</p>
<p>Intercede por nosotros, Santa Cecilia, ante el Dios de la melodía y el ritmo. Que nuestras obras resuenen como un himno de amor y esperanza en este mundo necesitado de paz.</p>
<p><em>Amén.</em></p>`
  },
  {
    id: 'todo-momento',
    label: 'Para rezar en todo momento',
    title: 'Oración para rezar en todo momento',
    subtitle: 'San Ignacio de Loyola',
    body: `<p>Ayúdame a clarificar mis intenciones, purifica mis sentimientos, santifica mis pensamientos y bendice mis esfuerzos, para que todo en mi vida sea de acuerdo a tu voluntad.</p>
<p>Tengo tantos deseos contradictorios… Me preocupo por cosas que ni importan ni son duraderas. Pero sé que si te entrego mi corazón haga lo que haga seguiré a mi nuevo corazón.</p>
<p>En todo lo que hoy soy, en todo lo que intente hacer, en mis encuentros, reflexiones, incluso en las frustraciones y fallos, y sobre todo en este rato de oración, en todo ello, haz que ponga mi vida en tus manos.</p>
<p>Señor, soy todo tuyo. Haz de mí lo que Tú quieras.</p>
<p><em>Amén.</em></p>`
  }
];

/**
 * Construye los tabs y paneles de oraciones en el contenedor indicado.
 * Ahora se llama una sola vez, para #v-prayers (ptabs-p / prayer-panels-p).
 * La sección duplicada que había en el Home se eliminó.
 */
function buildPrayerSet(tabsId, panelsId) {
  const tabs   = document.getElementById(tabsId);
  const panels = document.getElementById(panelsId);
  if (!tabs || !panels) return;

  // Limpiar por si se llama más de una vez
  tabs.innerHTML   = '';
  panels.innerHTML = '';

  PRAYERS.forEach((p, i) => {
    // Índice
    const btn = document.createElement('button');
    btn.className = 'pidx-item' + (i === 0 ? ' on' : '');
    btn.innerHTML = `<span class="pidx-name">${p.label}</span><span class="pidx-arrow">→</span>`;
    btn.onclick = () => {
      tabs.querySelectorAll('.pidx-item').forEach(x => x.classList.remove('on'));
      panels.querySelectorAll('.prayer-content').forEach(x => x.classList.remove('on'));
      btn.classList.add('on');
      document.getElementById(panelsId + '-pc-' + p.id).classList.add('on');
    };
    tabs.appendChild(btn);

    // Página — capitular en el primer párrafo vía CSS (.pp-dropcap), sin
    // tocar el HTML de cada oración (body ya viene armado como <p>...).
    const div = document.createElement('div');
    div.className = 'prayer-content' + (i === 0 ? ' on' : '');
    div.id = panelsId + '-pc-' + p.id;
    div.innerHTML = `
      <div class="prayer-box">
        ${p.subtitle ? `<div class="prayer-eyebrow">${p.subtitle}</div>` : ''}
        <div class="prayer-title">${p.title}</div>
        <div class="prayer-body pp-dropcap">${p.body}</div>
      </div>`;
    panels.appendChild(div);
  });
}

/** Punto de entrada llamado desde app.js → init() */
function buildPrayers() {
  buildPrayerSet('ptabs-p', 'prayer-panels-p');  // vista Oraciones
}

/**
 * Íconos de la lectura del día (#reading-accordion).
 * buildLecturaDelDia() en app.js arma esos ítems por fetch async, así que
 * en vez de tocar ese archivo, observamos el contenedor y le agregamos
 * el ícono correcto a cada .ra-item leyendo su propio texto (Primera /
 * Segunda lectura, Salmo, Evangelio). Así funciona también los domingos,
 * cuando aparece una 2da lectura y el orden de los ítems cambia.
 */
const READING_ICONS = {
  lectura1: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8137 7.03996C20.9823 6.58407 21.0376 6.09403 20.9749 5.61201C20.9122 5.12999 20.7333 4.67043 20.4536 4.27288C20.1739 3.87533 19.8018 3.55171 19.3693 3.32985C18.9368 3.10799 18.4568 2.99455 17.9708 2.99929C17.4847 3.00403 17.0071 3.1268 16.579 3.35705C16.1509 3.5873 15.7851 3.91812 15.5132 4.32104C15.2413 4.72397 15.0714 5.18693 15.0181 5.67008C14.9648 6.15323 15.0297 6.6421 15.2072 7.09462M14.1863 16.9583C14.0152 17.421 13.9608 17.9188 14.0279 18.4076C14.0951 18.8963 14.2818 19.361 14.5714 19.7604C14.861 20.1598 15.2447 20.4815 15.6884 20.6972C16.1321 20.9129 16.6222 21.0159 17.1152 20.9969C17.6081 20.978 18.0889 20.8378 18.5147 20.5887C18.9406 20.3396 19.2984 19.9893 19.5565 19.5689C19.8147 19.1485 19.9652 18.6709 19.9946 18.1784C20.0241 17.6859 19.9317 17.1938 19.7255 16.7456M7 2.99915C6.51039 2.99915 6.02822 3.11898 5.59557 3.34819C5.16293 3.57739 4.79296 3.90901 4.51795 4.31409C4.24294 4.71917 4.07126 5.1854 4.01788 5.67209C3.96451 6.15878 4.03106 6.65114 4.21173 7.1062M3.20598 16.9067C3.02586 17.3674 2.96244 17.8654 3.02136 18.3565C3.08027 18.8476 3.2597 19.3165 3.54366 19.7215C3.82762 20.1264 4.2073 20.4549 4.64892 20.6777C5.09053 20.9004 5.58036 21.0105 6.07482 20.9982M15.1619 6.98834L19.7916 16.8966M6.92695 3.00089L18.0276 3.00094M3.22118 16.8966L14.2201 16.8966M5.92695 21.0009L17.0276 21.0009M15.1979 7.04331L20.7895 7.04329M4.16193 6.98834L8.79163 16.8966"/></svg>`,
  lectura2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21.1428 20C20.9975 18.754 20.4816 17.5697 19.6539 16.5714M19.6539 16.5714C19.5644 16.4634 19.4713 16.3577 19.3746 16.2542C18.3834 15.1942 17.0629 14.4282 15.5845 14.0555C14.106 13.6828 12.5378 13.7207 11.0835 14.1642C9.62913 14.6078 8.35573 15.4365 7.42853 16.5429M19.6539 16.5714C20.4816 15.5731 20.9975 14.3888 21.1428 13.1428M19.6539 16.5714C19.5647 16.679 19.4718 16.7845 19.3754 16.8877C18.3847 17.9475 17.0648 18.7137 15.5869 19.0867C14.109 19.4597 12.5413 19.4224 11.0871 18.9797C9.63289 18.5369 8.35934 17.7091 7.4316 16.6036M2.85712 10.8572C3.00243 9.61119 3.51831 8.42685 4.34601 7.42857M4.34601 7.42857C4.43551 7.32063 4.52866 7.21485 4.62538 7.11142C5.61654 6.0514 6.93704 5.28534 8.41549 4.91265C9.89395 4.53996 11.4621 4.57786 12.9165 5.02141C14.3708 5.46496 15.6442 6.2937 16.5714 7.40007M4.34601 7.42857C3.51831 6.43029 3.00243 5.24595 2.85712 4M4.34601 7.42857C4.43526 7.53622 4.52813 7.6417 4.62456 7.74486C5.61525 8.80473 6.93515 9.57086 8.41305 9.94388C9.89096 10.3169 11.4587 10.2796 12.9129 9.83684C14.3671 9.39406 15.6406 8.56624 16.5684 7.46073"/></svg>`,
  evangelio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.29V2.70996C13.1595 2.70996 14.2715 3.17056 15.0913 3.99043C15.9112 4.8103 16.3718 5.92228 16.3718 7.08175C16.3718 8.24121 15.9112 9.35319 15.0913 10.1731C14.2715 10.9929 13.1595 11.4535 12 11.4535M5.37439 20.1971L18.6257 12.5465M5.37439 12.5464L18.6257 20.1971"/></svg>`
};

/**
 * Corrige el formato de la referencia del Salmo tal como viene de la fuente:
 * "Salmos 146(145),2abc.2d-4.5-6." → "Salmo 146 (145), 2 abc.2d-4.5-6."
 * - "Salmos" → "Salmo" (singular)
 * - espacio entre el número de capítulo y el paréntesis
 * - espacio después de la coma
 * - espacio entre el número de versículo y un grupo de letras (2abc → 2 abc),
 *   pero NO cuando es una sola letra pegada a un rango (2d-4 queda igual)
 */
function formatSalmoRef(text) {
  return text
    .replace(/^Salmos\b/i, 'Salmo')
    .replace(/(\d)\(/g, '$1 (')
    .replace(/,(?!\s)/g, ', ')
    .replace(/(\d)([a-z]{2,})/g, '$1 $2');
}

function iconizeReadingAccordion() {
  document.querySelectorAll('#reading-accordion .ra-item').forEach(item => {
    if (item.querySelector('.ra-icon')) return; // ya tiene ícono, no duplicar

    const label = (item.querySelector('.ra-label b')?.textContent || '').toLowerCase();
    let inner = null;
    if (label.includes('segunda')) inner = READING_ICONS.lectura2;
    else if (label.includes('primera') || (label.includes('lectura') && !label.includes('segunda'))) inner = READING_ICONS.lectura1;
    else if (label.includes('evangelio')) inner = READING_ICONS.evangelio;
    else if (label.includes('salmo')) {
      inner = '♪';
      const refSpan = item.querySelector('.ra-label span');
      if (refSpan && !refSpan.dataset.fixed) {
        refSpan.textContent = formatSalmoRef(refSpan.textContent);
        refSpan.dataset.fixed = '1'; // evita re-aplicar el fix si corre de nuevo
      }
    }
    if (inner === null) return; // tipo desconocido: no le ponemos ícono raro

    const icon = document.createElement('span');
    icon.className = 'ra-icon';
    icon.innerHTML = inner;
    item.insertBefore(icon, item.firstChild);
  });
}

/**
 * Sello con el color del tiempo litúrgico, al lado de la fecha en
 * "Lecturas del Día". Igual que iconizeReadingAccordion() de arriba: en
 * vez de tocar _renderLecturaDelDia() en app.js, se lee el texto que ya
 * viene ahí (data.liturgic, mostrado en .ra-eyebrow) y se decide el color
 * con un heurístico de palabras clave. No es un cálculo litúrgico real
 * (no hay acceso al calendario completo desde acá) — es una aproximación
 * a partir del texto que devuelve Evangelizo. Si en algún caso da un
 * color que no corresponde, conviene ajustar las palabras clave de acá
 * antes que desconfiar del dato en sí.
 */
const SEAL_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.9815 8.09051C10.072 8.53599 10.3133 8.93667 10.6646 9.22507C11.016 9.51348 11.456 9.67198 11.9106 9.6739C12.3652 9.67582 12.8065 9.52103 13.1603 9.2356C13.5141 8.95018 13.7587 8.55155 13.853 8.10685M11.9242 2.99686C11.7327 4.18724 11.1735 4.9476 10.7938 5.52689C10.3311 6.2328 9.8416 6.90775 9.97799 8.08785M11.9193 3.00122C12.6782 3.59864 13.2594 4.39209 13.6001 5.29583C13.9408 6.19957 14.0281 7.17924 13.8525 8.12898M12 11.7795V9.67392M8.5 21.0031H15.5C15.5 21.0031 15.1198 18.9134 15.1198 16.3913C15.1198 13.8692 15.5 11.7795 15.5 11.7795L8.5 11.7795C8.5 11.7795 8.88022 13.8692 8.88022 16.3913C8.88022 18.9134 8.5 21.0031 8.5 21.0031Z" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Verde por defecto (Tiempo Ordinario); el resto por palabra clave en el
// texto que trae Evangelizo (ej. "Martes de la 18ª semana del Tiempo
// Ordinario", "IV Domingo de Cuaresma", "Solemnidad de la Asunción").
const LITURGICAL_SEASONS = [
  { test: /cuaresma|adviento/i,                    color: 'var(--violet)' },
  { test: /pascua|navidad|solemnidad|domingo/i,    color: '#B08A1E' },
  { test: /viernes santo|semana santa|mártir(es)?/i, color: '#A5311C' },
];
const LITURGICAL_ORDINARY_COLOR = '#4C7A5A';

function _liturgicalColor(texto) {
  const match = LITURGICAL_SEASONS.find(s => s.test.test(texto));
  return match ? match.color : LITURGICAL_ORDINARY_COLOR;
}

function addLiturgicalSeal() {
  const head = document.querySelector('#reading-accordion .ra-head');
  if (!head || head.querySelector('.ra-seal')) return;

  const eyebrow = head.querySelector('.ra-eyebrow');
  const dateEl = head.querySelector('.ra-date');
  if (!eyebrow || !dateEl) return;

  const color = _liturgicalColor(eyebrow.textContent);

  const seal = document.createElement('div');
  seal.className = 'ra-seal';
  seal.style.background = color;
  seal.innerHTML = SEAL_ICON;

  const textWrap = document.createElement('div');
  textWrap.className = 'ra-head-text';
  const staleEl = head.querySelector('.ra-stale');
  textWrap.appendChild(eyebrow);
  textWrap.appendChild(dateEl);
  if (staleEl) textWrap.appendChild(staleEl);
  eyebrow.style.color = color;

  head.innerHTML = '';
  head.appendChild(seal);
  head.appendChild(textWrap);
}

const _raContainer = document.getElementById('reading-accordion');
if (_raContainer) {
  iconizeReadingAccordion(); // por si ya tiene contenido al cargar
  addLiturgicalSeal();
  new MutationObserver(() => { iconizeReadingAccordion(); addLiturgicalSeal(); })
    .observe(_raContainer, { childList: true, subtree: true });
}
