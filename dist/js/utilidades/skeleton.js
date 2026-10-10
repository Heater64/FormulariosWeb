(function(){"use strict";function a(s,r,i){return`<div class="skel" style="height:${s};${r?"width:"+r+";":""}${i||""}"></div>`}function d(s,r){r=r||{};const i=r.ancho||"100%";let e="";for(let o=0;o<s;o++){const c=56+o%3*22,n=14+o%2*8;e+=`
        <div class="skel-tarjeta" style="width:${i}">
          ${a(c,"100%","border-radius:var(--radio-lg);margin-bottom:var(--espaciado-sm)")}
          <div class="o-pila" style="gap:8px">
            ${a(n,"70%")}
            ${a("12px","45%")}
          </div>
        </div>`}return e}function l(){return`
      <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg)">
        ${a("28px","55%","border-radius:var(--radio-md);margin-bottom:var(--espaciado-md)")}
        <div class="mem-grid-tarjetas">
          ${a("90px","100%","border-radius:var(--radio-lg)")}
          ${a("90px","100%","border-radius:var(--radio-lg)")}
          ${a("90px","100%","border-radius:var(--radio-lg)")}
        </div>
        <div class="o-pila" style="gap:var(--espaciado-sm);margin-top:var(--espaciado-md)">
          ${d(6,{ancho:"100%"})}
        </div>
      </div>`}function v(){return`
      <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg)">
        ${a("28px","45%","border-radius:var(--radio-md);margin-bottom:var(--espaciado-md)")}
        <div class="o-pila" style="gap:var(--espaciado-sm)">
          ${d(5,{ancho:"100%"})}
        </div>
      </div>`}function p(){return`
      <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg)">
        ${a("28px","50%","border-radius:var(--radio-md);margin-bottom:var(--espaciado-md)")}
        <div class="mem-grid-tarjetas">
          ${a("80px","100%","border-radius:var(--radio-lg)")}
          ${a("80px","100%","border-radius:var(--radio-lg)")}
          ${a("80px","100%","border-radius:var(--radio-lg)")}
          ${a("80px","100%","border-radius:var(--radio-lg)")}
        </div>
        <div class="o-pila" style="gap:var(--espaciado-sm);margin-top:var(--espaciado-md)">
          ${d(4,{ancho:"100%"})}
        </div>
      </div>`}function t(){return`
      <div class="notas-home">
        <div style="padding:var(--espaciado-lg) var(--espaciado-lg) var(--espaciado-xs)">
          ${a("30px","40%","border-radius:var(--radio-md)")}
        </div>
        <div style="margin:var(--espaciado-sm) var(--espaciado-lg) var(--espaciado-md)">
          ${a("44px","100%","border-radius:var(--radio-pill)")}
        </div>
        <div class="o-pila" style="gap:var(--espaciado-xs);padding:0 var(--espaciado-lg)">
          ${a("64px","100%","border-radius:var(--radio-lg)")}
          ${a("64px","100%","border-radius:var(--radio-lg)")}
          ${a("64px","100%","border-radius:var(--radio-lg)")}
          ${a("64px","100%","border-radius:var(--radio-lg)")}
        </div>
      </div>`}window.skeleton={tarjetas:d,estudio:l,examenes:v,memorizacion:p,notas:t}})();
