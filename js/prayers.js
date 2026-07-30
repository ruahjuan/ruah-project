/**
 * prayers.js — FIAT
 * Responsabilidad única: datos y renderizado de las oraciones.
 * Sin dependencias externas. Sin acceso a state.js.
 */

const PRAYERS = [
  {
    id: 'antes',
    label: 'Antes de servir',
    title: 'Oración antes de servir',
    body: `<p>Señor, estoy aquí.</p>
<p>No vengo a mostrar mi voz ni mis acordes.<br>Vengo a abrir una puerta para que Vos entrés.</p>
<p>Si sueno bien, que sea tu belleza la que se escuche.<br>Si me equivoco, que mi error no opaque tu gracia.</p>
<p>Toma estos dedos, esta voz, este corazón inquieto.<br>Que la música que toque hoy no sea mía: sea tuya.</p>
<p>Hágase tu voluntad, Señor. No la mía.</p>
<p><em>Amén.</em></p>`
  },
  {
    id: 'despues',
    label: 'Después de servir',
    title: 'Oración después de servir',
    body: `<p>Gracias, Señor.</p>
<p>Por haberme usado como instrumento hoy.<br>Por lo que sonó bien y por lo que no sonó tan bien.</p>
<p>Perdóname si en algún momento busqué aplausos.<br>Perdóname si me olvidé de que servía a Vos.</p>
<p>Que las canciones de hoy sigan resonando en los corazones de los que cantaron. Y si alguien se acercó un poco más a Vos a través de esta música, toda la gloria es tuya.</p>
<p><em>Amén.</em></p>`
  },
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
    id: 'cecilia',
    label: 'A Santa Cecilia',
    title: 'Oración a Santa Cecilia',
    subtitle: 'Patrona de los músicos',
    body: `<p>Santa Cecilia, patrona de quienes tocamos y cantamos, intercede por nosotros ante el Señor.</p>
<p>Tú que consagraste tu arte y tu vida entera a Dios, enséñanos a tocar con humildad y a cantar con amor.</p>
<p>Que nuestra música nunca sea vanidad, sino puente entre los corazones y el Cielo.</p>
<p>Que cada nota que suene en este cancionero sea un acto de adoración, no de exhibición.</p>
<p>Ruega por los músicos que sirven sin aplausos, por los que ensayan cuando nadie los ve, por los que cantan aunque la voz tiemble.</p>
<p><em>Amén.</em></p>`
  },
  {
    id: 'espiritu',
    label: 'Ven, Espíritu Santo',
    title: 'Ven, Espíritu Santo',
    body: `<p>Ven, Espíritu Santo, llena los corazones de tus fieles y enciende en ellos el fuego de tu amor.</p>
<p>Envía tu Espíritu y serán creadas las cosas y renovarás la faz de la tierra.</p>
<p>Que la música de esta noche no sea solo música: que sea oración cantada, encuentro real, gracia que desciende sobre cada uno que canta.</p>
<p><em>Por Jesucristo Nuestro Señor. Amén.</em></p>`
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
    // Tab
    const btn = document.createElement('button');
    btn.className = 'ptab' + (i === 0 ? ' on' : '');
    btn.textContent = p.label;
    btn.onclick = () => {
      tabs.querySelectorAll('.ptab').forEach(x => x.classList.remove('on'));
      panels.querySelectorAll('.prayer-content').forEach(x => x.classList.remove('on'));
      btn.classList.add('on');
      document.getElementById(panelsId + '-pc-' + p.id).classList.add('on');
    };
    tabs.appendChild(btn);

    // Panel
    const div = document.createElement('div');
    div.className = 'prayer-content' + (i === 0 ? ' on' : '');
    div.id = panelsId + '-pc-' + p.id;
    div.innerHTML = `
      <div class="prayer-box">
        <div class="prayer-title">${p.title}</div>
        ${p.subtitle ? `<div class="prayer-sub">${p.subtitle}</div>` : ''}
        <div class="prayer-body">${p.body}</div>
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

function iconizeReadingAccordion() {
  document.querySelectorAll('#reading-accordion .ra-item').forEach(item => {
    if (item.querySelector('.ra-icon')) return; // ya tiene ícono, no duplicar

    const label = (item.querySelector('.ra-label b')?.textContent || '').toLowerCase();
    let inner = null;
    if (label.includes('segunda')) inner = READING_ICONS.lectura2;
    else if (label.includes('primera') || (label.includes('lectura') && !label.includes('segunda'))) inner = READING_ICONS.lectura1;
    else if (label.includes('evangelio')) inner = READING_ICONS.evangelio;
    else if (label.includes('salmo')) inner = '♪';
    if (inner === null) return; // tipo desconocido: no le ponemos ícono raro

    const icon = document.createElement('span');
    icon.className = 'ra-icon';
    icon.innerHTML = inner;
    item.insertBefore(icon, item.firstChild);
  });
}

const _raContainer = document.getElementById('reading-accordion');
if (_raContainer) {
  iconizeReadingAccordion(); // por si ya tiene contenido al cargar
  new MutationObserver(iconizeReadingAccordion)
    .observe(_raContainer, { childList: true, subtree: true });
}
