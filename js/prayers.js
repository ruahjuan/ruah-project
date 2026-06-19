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
<p>Fiat — hágase tu voluntad, Señor. No la mía. La tuya.</p>
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
 * Se llama dos veces: una para #v-home (ptabs / prayer-panels)
 * y otra para #v-prayers (ptabs-p / prayer-panels-p).
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
  buildPrayerSet('ptabs',   'prayer-panels');    // vista Home
  buildPrayerSet('ptabs-p', 'prayer-panels-p');  // vista Oraciones
}
