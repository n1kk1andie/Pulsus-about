/* Suite clusters: an accessible tab switcher (arrow keys, Home/End). Static —
   it never rotates by itself. Runs where the markup is, so there is no flash. */
(function(){
  document.querySelectorAll('.clusters').forEach(function(root){
    var tabs=[].slice.call(root.querySelectorAll('[role="tab"]'));
    if(!tabs.length) return;
    root.classList.add('js-cl');
    function show(i,focus){
      tabs.forEach(function(t,k){
        var on=k===i, p=document.getElementById(t.getAttribute('aria-controls'));
        t.setAttribute('aria-selected',on?'true':'false'); t.tabIndex=on?0:-1;
        if(p) p.hidden=!on;
      });
      if(focus) tabs[i].focus();
    }
    tabs.forEach(function(t,i){
      t.addEventListener('click',function(){show(i)});
      t.addEventListener('keydown',function(e){
        var n=tabs.length, j=null;
        if(e.key==='ArrowRight'||e.key==='ArrowDown') j=(i+1)%n;
        else if(e.key==='ArrowLeft'||e.key==='ArrowUp') j=(i-1+n)%n;
        else if(e.key==='Home') j=0; else if(e.key==='End') j=n-1;
        if(j!==null){e.preventDefault();show(j,true)}
      });
    });
    show(0);
  });
})();
