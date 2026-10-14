(function(){
  var map={'Details':'c2mfd','Floor Plans':'c2mff','Rent Roll':'c2mf','Renovation':'c2mfr'};
  var ids=['c2mfd','c2mff','c2mf','c2mfr'];
  var labels=Object.keys(map);
  function findBar(frame){
    var bar=null;
    frame.querySelectorAll('div').forEach(function(c){
      if(bar) return;
      var texts=[].map.call(c.children,function(k){return k.textContent.trim();});
      var hits=labels.filter(function(l){return texts.indexOf(l)>-1;}).length;
      if(hits>=3) bar=c;
    });
    return bar;
  }
  function show(active){
    ids.forEach(function(id){
      var f=document.getElementById(id); if(!f) return;
      var d=f.previousElementSibling, on=(id===active);
      f.style.display=on?'':'none';
      if(d) d.style.display=on?'':'none';
    });
    var f=document.getElementById(active); if(!f) return;
    var bar=findBar(f); if(!bar) return;
    [].forEach.call(bar.children,function(el){
      var t=el.textContent.trim(); if(labels.indexOf(t)<0) return;
      var on=(map[t]===active);
      el.style.cursor='pointer';
      el.style.color=on?'var(--color-accent-200)':'var(--color-neutral-500)';
      el.style.fontWeight=on?'600':'400';
      el.style.background=on?'color-mix(in srgb, var(--color-accent) 16%, transparent)':'transparent';
      el.style.borderBottom='none';
      el.style.borderRadius='4px';
    });
  }
  var current='c2mfd';
  function apply(){ show(current); }
  document.addEventListener('click',function(e){
    var leaf=e.target.closest && e.target.closest('span,div,a'); if(!leaf) return;
    var t=leaf.textContent.trim(); if(!map[t]) return;
    var frame=leaf.closest('#c2mfd,#c2mff,#c2mf,#c2mfr'); if(!frame) return;
    var bar=leaf.parentElement; if(!bar) return;
    var texts=[].map.call(bar.children,function(k){return k.textContent.trim();});
    var hits=labels.filter(function(l){return texts.indexOf(l)>-1;}).length;
    if(hits<3) return;
    e.preventDefault(); current=map[t]; apply();
  },true);
  document.addEventListener('click',function(e){
    var a=e.target.closest && e.target.closest('a[href^="#"]'); if(!a) return;
    var id=a.getAttribute('href').slice(1);
    if(ids.indexOf(id)>-1){ current=id; apply(); }
  },true);

  var adminState={tab:'pref',open:{gr:true}};
  function applyAdmin(){
    var frame=document.getElementById('adm'); if(!frame) return;
    frame.querySelectorAll('[data-atab]').forEach(function(el){
      var on=el.getAttribute('data-atab')===adminState.tab;
      el.style.color=on?'var(--color-accent-300)':'var(--color-neutral-400)';
      el.style.fontWeight=on?'600':'400';
      el.style.borderBottom=on?'2px solid var(--color-accent)':'2px solid transparent';
    });
    frame.querySelectorAll('[data-apage]').forEach(function(el){
      var on=el.getAttribute('data-apage')===adminState.tab;
      el.style.display=on?'flex':'none';
    });
    frame.querySelectorAll('[data-acc-body]').forEach(function(b){
      b.style.display=adminState.open[b.getAttribute('data-acc-body')]?'':'none';
    });
    frame.querySelectorAll('[data-acc]').forEach(function(h){
      var arrow=h.querySelector('[data-acc-arrow]');
      if(arrow) arrow.textContent=adminState.open[h.getAttribute('data-acc')]?'\u25BE':'\u25B8';
    });
  }
  document.addEventListener('click',function(e){
    var t=e.target.closest && e.target.closest('[data-atab]');
    if(t){ adminState.tab=t.getAttribute('data-atab'); applyAdmin(); return; }
    var h=e.target.closest && e.target.closest('[data-acc]');
    if(h && document.getElementById('adm') && document.getElementById('adm').contains(h)){
      var k=h.getAttribute('data-acc'); adminState.open[k]=!adminState.open[k]; applyAdmin();
    }
  },true);

  var raf=0;
  function schedule(){ if(raf) return; raf=requestAnimationFrame(function(){ raf=0; apply(); applyAdmin(); }); }
  apply(); applyAdmin();
  if(window.MutationObserver){
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  }
  window.addEventListener('load',function(){apply();applyAdmin();});
  setTimeout(function(){apply();applyAdmin();},300); setTimeout(function(){apply();applyAdmin();},800); setTimeout(function(){apply();applyAdmin();},1600);
})();
