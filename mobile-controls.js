// mobile-controls.js — injects touch controls and translates them to keyboard/pointer events
(function(){
  // produce KeyboardEvent with keyCode/which when possible
  function makeKeyboardEvent(type, key, code, keyCode){
    let ev;
    try{
      ev = new KeyboardEvent(type, {key: key, code: code, bubbles:true, cancelable:true});
      try{ Object.defineProperty(ev, 'keyCode', {get: ()=>keyCode}); }catch(_){}
      try{ Object.defineProperty(ev, 'which', {get: ()=>keyCode}); }catch(_){}
    }catch(err){
      try{
        ev = document.createEvent('KeyboardEvent');
        ev.initKeyboardEvent(type, true, true, window, key, 0, '', false, '');
      }catch(e){
        ev = document.createEvent('Event'); ev.initEvent(type, true, true); ev.key = key;
      }
      try{ Object.defineProperty(ev, 'keyCode', {get: ()=>keyCode}); }catch(_){}
    }
    return ev;
  }

  function dispatchKeySet(type, list){
    for(const k of list){
      const ev = makeKeyboardEvent(type, k.key, k.code, k.keyCode);
      window.dispatchEvent(ev);
      document.dispatchEvent(ev);
      const c = document.querySelector('canvas'); if(c) c.dispatchEvent(ev);
    }
  }

  function createControls(){
    const wrap = document.createElement('div');
    wrap.id = 'mobile-controls';
    wrap.innerHTML = `
      <div class="mc-left">
        <div class="mc-joystick">
          <div class="dirs">
            <div></div><div class="btn small" data-key="ArrowUp">↑</div><div></div>
            <div class="btn small" data-key="ArrowLeft">←</div><div class="btn small center" data-key=" ">●</div><div class="btn small" data-key="ArrowRight">→</div>
            <div></div><div class="btn small" data-key="ArrowDown">↓</div><div></div>
          </div>
        </div>
      </div>
      <div class="mc-right">
        <div class="mc-buttons">
          <div class="mc-actions">
            <div class="btn" id="mc-jump" data-key=" ">Jump</div>
            <div class="btn" id="mc-use">Use</div>
            <div class="btn" id="mc-toggle-btn">Hide</div>
          </div>
        </div>
      </div>
      <button id="mc-toggle">Controls</button>
    `;
    document.body.appendChild(wrap);

    const keyMap = {
      'ArrowUp': [{key:'ArrowUp',code:'ArrowUp',keyCode:38},{key:'w',code:'KeyW',keyCode:87}],
      'ArrowDown': [{key:'ArrowDown',code:'ArrowDown',keyCode:40},{key:'s',code:'KeyS',keyCode:83}],
      'ArrowLeft': [{key:'ArrowLeft',code:'ArrowLeft',keyCode:37},{key:'a',code:'KeyA',keyCode:65}],
      'ArrowRight': [{key:'ArrowRight',code:'ArrowRight',keyCode:39},{key:'d',code:'KeyD',keyCode:68}],
      ' ': [{key:' ',code:'Space',keyCode:32},{key:'Space',code:'Space',keyCode:32}],
      'Enter': [{key:'Enter',code:'Enter',keyCode:13}]
    };

    wrap.querySelectorAll('.btn[data-key]').forEach(b=>{
      const raw = b.getAttribute('data-key') || '';
      const list = keyMap[raw] || [{key:raw, code:raw, keyCode: raw.length? raw.charCodeAt(0) : 0}];
      b.addEventListener('touchstart', e=>{ e.preventDefault(); dispatchKeySet('keydown', list); b.classList.add('active'); });
      b.addEventListener('touchend', e=>{ e.preventDefault(); dispatchKeySet('keyup', list); b.classList.remove('active'); });
      b.addEventListener('mousedown', e=>{ e.preventDefault(); dispatchKeySet('keydown', list); b.classList.add('active'); });
      b.addEventListener('mouseup', e=>{ e.preventDefault(); dispatchKeySet('keyup', list); b.classList.remove('active'); });
    });

    const useBtn = wrap.querySelector('#mc-use');
    useBtn.addEventListener('touchstart', e=>{ e.preventDefault();
      const canvas = document.querySelector('canvas');
      if(canvas){ const rect=canvas.getBoundingClientRect(); const cx=rect.left+rect.width/2; const cy=rect.top+rect.height/2; const pd = new PointerEvent('pointerdown',{clientX:cx,clientY:cy,bubbles:true,pointerType:'touch'}); canvas.dispatchEvent(pd); const md = new MouseEvent('mousedown',{clientX:cx,clientY:cy,bubbles:true}); canvas.dispatchEvent(md); }
    });
    useBtn.addEventListener('touchend', e=>{ e.preventDefault(); const canvas=document.querySelector('canvas'); if(canvas){ const rect=canvas.getBoundingClientRect(); const cx=rect.left+rect.width/2; const cy=rect.top+rect.height/2; const pu = new PointerEvent('pointerup',{clientX:cx,clientY:cy,bubbles:true,pointerType:'touch'}); canvas.dispatchEvent(pu); const mu = new MouseEvent('mouseup',{clientX:cx,clientY:cy,bubbles:true}); canvas.dispatchEvent(mu); const click = new MouseEvent('click',{clientX:cx,clientY:cy,bubbles:true}); canvas.dispatchEvent(click); } });

    const toggle = document.getElementById('mc-toggle');
    const controls = document.getElementById('mobile-controls');
    toggle.addEventListener('click', ()=>{ if(controls.style.display==='none'){controls.style.display='block'}else{controls.style.display='none'} });
    controls.style.display='block';

    // touch -> movement translation (only when touching canvas or our controls)
    var lastX = null, lastY = null;
    var touchActive = false; // whether we started a touch on game area / controls
    function getTarget(){ return document.querySelector('canvas') || document; }
    function isGameTarget(el){
      try{
        if(!el) return false;
        if(el.nodeType !== 1) el = el.parentElement;
        if(!el) return false;
        return !!(el.closest && (el.closest('canvas') || el.closest('#mobile-controls')));
      }catch(e){ return false; }
    }
    function touchStart(e){
      var t = e.touches[0];
      var el = (t && t.target) || e.target;
      if(!isGameTarget(el)){
        touchActive = false; // allow native taps on other UI
        return;
      }
      touchActive = true;
      lastX = t.clientX; lastY = t.clientY;
      const pd = new PointerEvent('pointerdown',{clientX:lastX,clientY:lastY,bubbles:true,pointerType:'touch'});
      getTarget().dispatchEvent(pd);
      const md = new MouseEvent('mousedown',{clientX:lastX,clientY:lastY,bubbles:true});
      getTarget().dispatchEvent(md);
      e.preventDefault();
    }
    function touchMove(e){
      if(!touchActive) return; // ignore moves that didn't start on game area
      if(lastX===null){ var t0=e.touches[0]; lastX=t0.clientX; lastY=t0.clientY; return; }
      var t = e.touches[0];
      var dx = t.clientX - lastX; var dy = t.clientY - lastY;
      lastX = t.clientX; lastY = t.clientY;
      try{
        var pe = new PointerEvent('pointermove',{bubbles:true,clientX:t.clientX,clientY:t.clientY,movementX:dx,movementY:dy,pointerType:'touch'});
        getTarget().dispatchEvent(pe);
      }catch(err){
        var me = new MouseEvent('mousemove',{bubbles:true,clientX:t.clientX,clientY:t.clientY});
        try{ Object.defineProperty(me,'movementX',{get:()=>dx}); Object.defineProperty(me,'movementY',{get:()=>dy}); }catch(_){}
        getTarget().dispatchEvent(me);
      }
      e.preventDefault();
    }
    function touchEnd(e){
      if(!touchActive) return;
      const pu = new PointerEvent('pointerup',{bubbles:true}); getTarget().dispatchEvent(pu);
      const mu = new MouseEvent('mouseup',{bubbles:true}); getTarget().dispatchEvent(mu);
      lastX = lastY = null; touchActive = false;
      e.preventDefault();
    }
    window.addEventListener('touchstart', touchStart, {passive:false});
    window.addEventListener('touchmove', touchMove, {passive:false});
    window.addEventListener('touchend', touchEnd, {passive:false});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', createControls); else createControls();
})();
