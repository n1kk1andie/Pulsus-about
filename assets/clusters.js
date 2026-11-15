/* Suite clusters: an accessible tab switcher (arrow keys, Home/End) that
   auto-rotates through the clusters so visitors see there is more to tap.
   - A red bar under the active tab fills while it is shown; dots under the
     panel show where you are.
   - Rotation pauses while the pointer or keyboard focus is inside, while the
     section is off screen and while the tab is hidden.
   - Choosing a tab (or a dot) stops it; the "Auto-rotate" switch turns it
     back on or off, and that choice is remembered on this device.
   - Off by default for people who ask for reduced motion.
   Runs where the markup is, so there is no flash. */
(function(){
  var DWELL=7000, KEY='pulsus-cl-autorotate';
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function saved(){try{return localStorage.getItem(KEY)}catch(e){return null}}
  function save(v){try{localStorage.setItem(KEY,v?'1':'0')}catch(e){}}

  document.querySelectorAll('.clusters').forEach(function(root){
    var tabs=[].slice.call(root.querySelectorAll('[role="tab"]'));
    if(!tabs.length) return;
    root.classList.add('js-cl');
    root.style.setProperty('--cl-dwell',DWELL+'ms');
    var list=root.querySelector('.cl-tabs'), cur=0, hover=false, focusIn=false, visible=true;
    var s=saved(), auto=s===null?!reduce:s==='1';

    /* Progress bar under each tab */
    var fills=tabs.map(function(t){
      var bar=document.createElement('span'); bar.className='cl-prog'; bar.setAttribute('aria-hidden','true');
      var f=document.createElement('i'); bar.appendChild(f); t.appendChild(bar);
      f.addEventListener('animationend',function(){ if(auto) show((cur+1)%tabs.length) });
      return f;
    });

    /* Auto-rotate switch above the tabs */
    var bar=document.createElement('div'); bar.className='cl-auto';
    bar.innerHTML='<span class="cl-auto-l" id="'+tabs[0].id+'-auto">Auto-rotate</span>'+
      '<span class="cl-auto-s" aria-hidden="true"></span>'+
      '<button type="button" class="cl-sw" role="switch" aria-labelledby="'+tabs[0].id+'-auto"><span></span></button>';
    var sw=bar.querySelector('.cl-sw'), st=bar.querySelector('.cl-auto-s');
    list.parentNode.insertBefore(bar,list);

    /* Dots under the last panel */
    var panels=tabs.map(function(t){return document.getElementById(t.getAttribute('aria-controls'))});
    var dots=document.createElement('div'); dots.className='cl-dots'; dots.setAttribute('aria-hidden','true');
    var dotEls=tabs.map(function(t,i){
      var d=document.createElement('button'); d.type='button'; d.tabIndex=-1;
      d.addEventListener('click',function(){ setAuto(false); show(i) });
      dots.appendChild(d); return d;
    });
    var last=panels[panels.length-1];
    if(last) last.parentNode.insertBefore(dots,last.nextSibling);

    function paused(){ return !auto||hover||focusIn||!visible||document.hidden }
    function sync(){
      root.classList.toggle('cl-on',auto);
      root.classList.toggle('cl-paused',paused());
      sw.setAttribute('aria-checked',auto?'true':'false');
      st.textContent=auto?'On':'Off';
    }
    function restart(i){ /* replay the fill animation on the active tab */
      var f=fills[i]; f.style.animation='none'; void f.offsetWidth; f.style.animation='';
    }
    function show(i,focus){
      cur=i;
      tabs.forEach(function(t,k){
        var on=k===i;
        t.setAttribute('aria-selected',on?'true':'false'); t.tabIndex=on?0:-1;
        if(panels[k]) panels[k].hidden=!on;
        dotEls[k].classList.toggle('on',on);
      });
      restart(i);
      if(focus) tabs[i].focus();
    }
    function setAuto(v){
      if(auto===v) return; auto=v; save(v);
      if(v) restart(cur);
      sync();
    }

    sw.addEventListener('click',function(){ setAuto(!auto) });
    tabs.forEach(function(t,i){
      t.addEventListener('click',function(){ setAuto(false); show(i) });
      t.addEventListener('keydown',function(e){
        var n=tabs.length, j=null;
        if(e.key==='ArrowRight'||e.key==='ArrowDown') j=(i+1)%n;
        else if(e.key==='ArrowLeft'||e.key==='ArrowUp') j=(i-1+n)%n;
        else if(e.key==='Home') j=0; else if(e.key==='End') j=n-1;
        if(j!==null){e.preventDefault();setAuto(false);show(j,true)}
      });
    });

    /* Pause conditions */
    root.addEventListener('pointerenter',function(e){ if(e.pointerType==='mouse'){hover=true;sync()} });
    root.addEventListener('pointerleave',function(e){ if(e.pointerType==='mouse'){hover=false;sync()} });
    root.addEventListener('focusin',function(e){ if(e.target!==sw){focusIn=true;sync()} });
    root.addEventListener('focusout',function(){ setTimeout(function(){ focusIn=root.contains(document.activeElement)&&document.activeElement!==sw; sync() },0) });
    document.addEventListener('visibilitychange',sync);
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){ visible=es[0].isIntersecting; sync() },{threshold:.6}).observe(list);
    }

    show(0); sync();
  });
})();
