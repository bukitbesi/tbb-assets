/* The Bukit Besi progressive web enhancements — no dependencies. */
(function(){
  'use strict';
  var doc=document,win=window;
  var cfg=Object.assign({
    serviceWorker:'/service-worker.js',
    article:'.post-body',
    headings:'h2,h3',
    tocMin:3,
    prefetch:true,
    pushEndpoint:'',
    vapidPublicKey:''
  },win.TBB_PWA||{});

  function ready(fn){doc.readyState==='loading'?doc.addEventListener('DOMContentLoaded',fn,{once:true}):fn()}
  function slug(text,index){var s=text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\u00C0-\u024f]+/g,'-').replace(/^-|-$/g,'');return s||'bahagian-'+index}

  function progress(article){
    var root=doc.createElement('div'),bar=doc.createElement('span'),ticking=false;
    root.className='tbb-reading-progress';root.setAttribute('aria-hidden','true');root.appendChild(bar);doc.body.appendChild(root);
    function update(){var box=article.getBoundingClientRect(),start=win.scrollY+box.top-win.innerHeight*.2,end=Math.max(start+1,start+article.offsetHeight-win.innerHeight*.65);var n=Math.min(1,Math.max(0,(win.scrollY-start)/(end-start)));bar.style.transform='scaleX('+n.toFixed(4)+')';ticking=false}
    win.addEventListener('scroll',function(){if(!ticking){ticking=true;win.requestAnimationFrame(update)}},{passive:true});
    win.addEventListener('resize',update,{passive:true});update();
  }

  function toc(article){
    if(article.querySelector('.tbb-toc'))return;
    var headings=[].slice.call(article.querySelectorAll(cfg.headings)).filter(function(h){return h.textContent.trim().length>2});
    if(headings.length<cfg.tocMin)return;
    var used=new Set(),details=doc.createElement('details'),summary=doc.createElement('summary'),list=doc.createElement('ol');
    details.className='tbb-toc';details.open=win.matchMedia('(min-width:900px)').matches;summary.textContent='Kandungan artikel';details.append(summary,list);
    headings.forEach(function(h,i){var base=h.id||slug(h.textContent.trim(),i+1),id=base,n=2;while(used.has(id)||doc.getElementById(id)){id=base+'-'+n++}if(!h.id)h.id=id;used.add(h.id);h.style.scrollMarginTop='6rem';var li=doc.createElement('li'),a=doc.createElement('a');li.dataset.level=h.tagName.slice(1);a.href='#'+encodeURIComponent(h.id);a.textContent=h.textContent.trim();li.appendChild(a);list.appendChild(li)});
    var first=headings[0];first.parentNode.insertBefore(details,first);
  }

  function netStatus(){
    var el=doc.createElement('div'),timer;el.className='tbb-net-status';el.setAttribute('role','status');el.setAttribute('aria-live','polite');doc.body.appendChild(el);
    function show(text){clearTimeout(timer);el.textContent=text;el.dataset.show='true';timer=setTimeout(function(){el.dataset.show='false'},3200)}
    win.addEventListener('offline',function(){show('Anda kini di luar talian')});
    win.addEventListener('online',function(){show('Sambungan internet dipulihkan')});
  }

  function install(){
    if(win.matchMedia('(display-mode: standalone)').matches||win.navigator.standalone)return;
    var promptEvent=null,button=doc.createElement('button');button.type='button';button.className='tbb-install';button.textContent='Pasang aplikasi';button.setAttribute('aria-label','Pasang aplikasi The Bukit Besi');doc.body.appendChild(button);
    try{var visits=parseInt(localStorage.getItem('tbb-pwa-visits')||'0',10)+1;localStorage.setItem('tbb-pwa-visits',String(Math.min(visits,9)));if(visits>1)button.dataset.ready='true'}catch(_){button.dataset.ready='true'}
    win.addEventListener('beforeinstallprompt',function(e){e.preventDefault();promptEvent=e;button.dataset.ready='true'});
    function guide(){
      var old=doc.querySelector('.tbb-install-guide');if(old)old.remove();
      var wrap=doc.createElement('div'),box=doc.createElement('div'),title=doc.createElement('strong'),text=doc.createElement('p'),close=doc.createElement('button');
      wrap.className='tbb-install-guide';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-labelledby','tbb-install-title');
      box.className='tbb-install-guide__box';title.id='tbb-install-title';title.textContent='Tambah The Bukit Besi ke skrin utama';
      var ios=/iPad|iPhone|iPod/.test(navigator.userAgent);text.textContent=ios?'Tekan Share, kemudian pilih Add to Home Screen.':'Buka menu pelayar (⋮), kemudian pilih Pasang aplikasi atau Tambah ke skrin utama.';
      close.type='button';close.textContent='Tutup';close.addEventListener('click',function(){wrap.remove();button.focus()});wrap.addEventListener('click',function(e){if(e.target===wrap)close.click()});
      box.append(title,text,close);wrap.appendChild(box);doc.body.appendChild(wrap);close.focus();
    }
    button.addEventListener('click',async function(){if(!promptEvent){guide();return}button.dataset.ready='false';await promptEvent.prompt();await promptEvent.userChoice;promptEvent=null});
    win.addEventListener('appinstalled',function(){button.remove()});
  }

  function prefetch(){
    if(!cfg.prefetch||!('HTMLLinkElement' in win)||navigator.connection?.saveData)return;
    var seen=new Set(),timer;
    function candidate(a){if(!a||a.origin!==location.origin||a.target||a.hasAttribute('download')||a.rel.includes('nofollow'))return false;return !/\/(search|feeds|b)\//.test(a.pathname)&&!a.search}
    function add(a){if(!candidate(a)||seen.has(a.href))return;seen.add(a.href);var link=doc.createElement('link');link.rel='prefetch';link.href=a.href;link.as='document';doc.head.appendChild(link)}
    doc.addEventListener('pointerover',function(e){var a=e.target.closest&&e.target.closest('a[href]');clearTimeout(timer);timer=setTimeout(function(){add(a)},120)},{passive:true});
    doc.addEventListener('pointerout',function(){clearTimeout(timer)},{passive:true});
    doc.addEventListener('touchstart',function(e){add(e.target.closest&&e.target.closest('a[href]'))},{passive:true});
  }

  function registerSW(){
    if(!cfg.serviceWorker||!('serviceWorker' in navigator)||location.protocol!=='https:')return;
    win.addEventListener('load',function(){navigator.serviceWorker.register(cfg.serviceWorker,{scope:'/',updateViaCache:'none'}).catch(function(err){if(win.console)console.info('[TBB PWA] Service Worker belum tersedia pada origin utama.',err.message)})},{once:true});
  }

  ready(function(){var article=doc.querySelector(cfg.article);if(article){progress(article);toc(article)}netStatus();install();prefetch();registerSW()});
})();
