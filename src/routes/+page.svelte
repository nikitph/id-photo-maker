<script>
  import { onMount, tick } from 'svelte';
  import Icon from '$lib/Icon.svelte';
  import { presets, outputSpec } from '$lib/presets';
  import { translate } from '$lib/i18n';
  import { loadVision, decodeFile, prepareSubject, cropPhoto, prepareSignature, compressJpeg, makeCanvas, cameraAnalysis } from '$lib/pipeline';

  let lang=$state('en'),step=$state(1),mode=$state('photo'),selected=$state('upsc-cse'),search=$state('');
  let allForms=$state(false),dialog=$state(''),dialogEl=$state();
  let source=$state(null),prepared=null,output=$state(null),outputURL=$state(''),sample=$state(false),busy=$state(false),error=$state(''),warning=$state(''),toast=$state('');
  let fileInput,video=$state(),stream=null,cameraTimer=null,cameraOpen=$state(false),cameraReady=$state(false),guidance=$state(''),guidancePass=$state(false),speech=$state(false),visionReady=$state(false);
  let adjustments=$state({zoom:1,x:0,y:0,rotation:0,strip:false,name:'',date:new Date().toLocaleDateString('en-IN')}),editing=$state(false),bg=$state(true),postcard=$state(false);
  let custom=$state({width:200,height:230,unit:'px',dpi:300,minKB:20,maxKB:50});
  let result=$state(null),feedback=$state(''),operator=$state(false),customer=$state(''),sampleAfter=$state(''),offline=$state(false),offlineReady=$state(false);
  let focusHeading=$state();
  const t=(key)=>translate(lang,key);
  const p=$derived(presets.find(p=>p.id===selected)||presets[0]);
  const spec=$derived(outputSpec(p,mode,custom,postcard));
  const shown=$derived(presets.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||p.sub.toLowerCase().includes(search.toLowerCase())||p.id.includes(search.toLowerCase())).filter(p=>allForms||search||p.id!=='sarathi'));
  const stage=$derived(step===4?3:step);
  const cameraText=$derived(guidance==='dark'?(lang==='hi'?'थोड़ी और रोशनी चाहिए':lang==='mr'?'अधिक प्रकाश हवा':'Find a little more light'):guidance==='no-face'?(lang==='hi'?'कैमरे की ओर देखें':lang==='mr'?'कॅमेऱ्याकडे पाहा':'Look straight at the camera'):guidance==='closer'?(lang==='hi'?'थोड़ा पास आएँ':lang==='mr'?'थोडे जवळ या':'Move a little closer'):guidance==='back'?(lang==='hi'?'थोड़ा पीछे जाएँ':lang==='mr'?'थोडे मागे जा':'Move a little further back'):guidance==='centre'?(lang==='hi'?'चेहरा बीच में रखें':lang==='mr'?'चेहरा मध्यभागी ठेवा':'Move your face to the centre'):t('cameraTip'));

  function notify(message){toast=message;setTimeout(()=>toast='',4200);}
  function setPreset(id){selected=id;postcard=false;if(id==='ssc-cgl')mode='signature';}
  function setMode(value){mode=value;if(value==='photo'&&p.id==='ssc-cgl')selected='upsc-cse';}
  function scrollTop(){window.scrollTo({top:0,behavior:'smooth'});tick().then(()=>focusHeading?.focus({preventScroll:true}));}
  function next(){error='';if(p.id==='custom'&&(!spec.width||!spec.height||spec.width<20||spec.height<20||spec.width>2400||spec.height>2400||spec.minKB<1||spec.maxKB>2000||spec.minKB>=spec.maxKB)){error=t('customError');return;}step=2;scrollTop();loadVision().then(()=>visionReady=true).catch(()=>{});}
  function goBack(){stopCamera();error='';if(step>1){step=step===4?3:step-1;scrollTop();}}
  async function showDialog(kind){dialog=kind;await tick();dialogEl?.showModal();}
  function closeDialog(){dialogEl?.close();dialog='';}
  function changeLanguage(e){lang=e.target.value;try{localStorage.setItem('idphoto-language',lang);}catch{}document.documentElement.lang=lang;}
  function resetAdjustment(){adjustments={zoom:1,x:0,y:0,rotation:0,strip:false,name:'',date:new Date().toLocaleDateString('en-IN')};}
  function releaseOutput(){if(outputURL)URL.revokeObjectURL(outputURL);outputURL='';output=null;}
  async function receiveFile(e){const f=e.target.files?.[0];if(!f)return;error='';sample=false;resetAdjustment();try{source=await decodeFile(f);await processPhoto();}catch(e){error=e.message;}finally{e.target.value='';}}
  async function runDemo(){error='';sample=true;resetAdjustment();try{if(mode==='signature'){const c=makeCanvas(900,360),x=c.getContext('2d');x.fillStyle='#eeeae1';x.fillRect(0,0,900,360);x.strokeStyle='#26323d';x.lineWidth=4;x.lineCap='round';x.beginPath();x.moveTo(170,230);x.bezierCurveTo(250,160,390,35,310,75);x.bezierCurveTo(270,90,250,290,330,210);x.bezierCurveTo(370,170,365,230,400,205);x.bezierCurveTo(460,160,410,265,505,190);x.bezierCurveTo(535,140,520,225,560,195);x.bezierCurveTo(630,145,540,265,690,180);x.stroke();x.beginPath();x.moveTo(260,260);x.bezierCurveTo(390,240,550,245,720,210);x.stroke();source=c;}else{const r=await fetch('/assets/sample-portrait.jpg');source=await decodeFile(await r.blob());}await processPhoto();}catch(e){error=e.message;}}
  async function processPhoto(reuse=false){
    error='';busy=true;editing=false;warning='';await tick();
    try{
      if(!source)throw new Error('Please add a photo first.');
      let canvas,stats,face,background;
      if(mode==='signature'){const r=prepareSignature(source,spec,adjustments.rotation);canvas=r.canvas;stats=r.stats;background=true;}
      else{if(!reuse||!prepared)prepared=await prepareSubject(source,bg);canvas=cropPhoto(prepared,spec,adjustments);stats=prepared.stats;face=prepared.face;background=prepared.background;if(prepared.warning)warning=prepared.warning==='confidence'?'The background edge is uncertain. Try a photo against a lighter wall; your original background has been kept.':t('backgroundError');}
      const blob=await compressJpeg(canvas,spec);releaseOutput();output=blob;outputURL=URL.createObjectURL(blob);result={width:canvas.width,height:canvas.height,kb:blob.size/1024,face,background,stats};step=3;scrollTop();
    }catch(e){error=e.message;}finally{busy=false;}
  }
  async function toggleBackground(){bg=!bg;await processPhoto(false);}
  async function download(){if(!output)return;const prefix=(operator&&customer?customer:p.name).replace(/[^\p{L}\p{N}_-]+/gu,'_');const a=document.createElement('a');a.href=outputURL;a.download=`${prefix}_${mode}${postcard?'_postcard':''}.jpg`;document.body.append(a);a.click();a.remove();step=4;scrollTop();}
  function restart(sameForm=false){stopCamera();releaseOutput();source=null;prepared=null;result=null;feedback='';sample=false;customer='';warning='';error='';resetAdjustment();step=sameForm?2:1;scrollTop();}
  function signatureNext(){restart(true);mode='signature';}
  async function share(){const u=new URL(window.location.href);u.pathname=`/${p.id}`;u.hash='';const data={title:'ID Photo Maker',text:'Get your application photo and signature ready, right on your phone.',url:u.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(u.href);notify(lang==='hi'?'लिंक कॉपी हो गया':lang==='mr'?'लिंक कॉपी झाली':'Link copied. Send it to someone with an application ahead.');}}catch(e){if(e.name!=='AbortError')notify('Copy the link from your browser to share this tool.');}}
  function recordFeedback(value){feedback=value;try{localStorage.setItem('idphoto-feedback',JSON.stringify({preset:p.id,accepted:value==='yes',date:Date.now()}));}catch{}if(value==='no')notify(t('report'));}
  async function openCamera(){error='';cameraOpen=true;cameraReady=false;guidancePass=false;await tick();try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:mode==='signature'?'environment':'user',width:{ideal:720},height:{ideal:960}},audio:false});if(!cameraOpen){stream.getTracks().forEach(t=>t.stop());return;}video.srcObject=stream;await video.play();cameraReady=true;loadVision().then(()=>visionReady=true).catch(()=>{});const c=makeCanvas(240,320);cameraTimer=setInterval(()=>{if(!video||!cameraReady)return;const x=c.getContext('2d');x.drawImage(video,0,0,c.width,c.height);const a=cameraAnalysis(c,mode==='signature');const previous=guidance;guidance=a.key;guidancePass=a.pass;if(speech&&previous!==guidance){window.speechSynthesis.cancel();const utter=new SpeechSynthesisUtterance(cameraText);utter.lang=lang==='hi'?'hi-IN':lang==='mr'?'mr-IN':'en-IN';window.speechSynthesis.speak(utter);}},750);}catch{stopCamera();error=t('cameraUnavailable');}}
  function stopCamera(){if(cameraTimer)clearInterval(cameraTimer);cameraTimer=null;stream?.getTracks().forEach(t=>t.stop());stream=null;cameraOpen=false;cameraReady=false;window.speechSynthesis?.cancel();}
  async function capture(){if(!video||!guidancePass)return;const c=makeCanvas(Math.min(video.videoWidth,900),Math.min(video.videoWidth,900)*video.videoHeight/video.videoWidth);c.getContext('2d').drawImage(video,0,0,c.width,c.height);source=c;sample=false;resetAdjustment();stopCamera();await processPhoto();}

  onMount(()=>{
    try{const l=localStorage.getItem('idphoto-language');if(['en','hi','mr'].includes(l))lang=l;}catch{}
    document.documentElement.lang=lang;
    const path=window.location.pathname.split('/').filter(Boolean)[0];const id=window.location.hash.slice(1)||path;if(presets.some(p=>p.id===id)){setPreset(id);step=2;}
    offline=!navigator.onLine;const online=()=>offline=!navigator.onLine;window.addEventListener('online',online);window.addEventListener('offline',online);
    const warm=setTimeout(async()=>{try{await loadVision();visionReady=true;const r=await fetch('/assets/sample-portrait.jpg');const c=await decodeFile(await r.blob());const subject=await prepareSubject(c,true);const finished=cropPhoto(subject,{width:280,height:350});sampleAfter=finished.toDataURL('image/jpeg',.87);}catch{}},1800);
    const swMessage=(event)=>{if(event.data?.type==='OFFLINE_READY')offlineReady=true;};
    const cacheTools=()=>{offlineReady=false;navigator.serviceWorker.controller?.postMessage({type:'CACHE_VISION'});};
    if('serviceWorker' in navigator && !import.meta.env.DEV){navigator.serviceWorker.addEventListener('message',swMessage);navigator.serviceWorker.addEventListener('controllerchange',cacheTools);navigator.serviceWorker.ready.then(()=>cacheTools());}
    return()=>{clearTimeout(warm);stopCamera();releaseOutput();navigator.serviceWorker?.removeEventListener('message',swMessage);navigator.serviceWorker?.removeEventListener('controllerchange',cacheTools);window.removeEventListener('online',online);window.removeEventListener('offline',online);};
  });
</script>

<svelte:head>
 <title>ID Photo Maker — Your next chapter, picture ready.</title>
 <meta name="description" content="Prepare ID photos and signatures for Indian application forms, privately on your phone. Exact pixels, exact KB, no uploads. English, Hindi and Marathi." />
</svelte:head>

<div class="site-shell">
 <header class="site-header">
  <a class="brand" href="/" aria-label="ID Photo Maker home" onclick={(e)=>{e.preventDefault();restart();}}><span class="brand-symbol"><Icon name="face" size={25}/></span><span>idphoto<span class="brand-dot">.</span></span></a>
  <nav class="desktop-nav" aria-label="Main navigation"><button onclick={()=>showDialog('how')}>{t('how')}</button><button onclick={()=>showDialog('guide')}>{t('guide')}</button></nav>
  <div class="header-actions"><div class="local-tag"><span class="status-dot"></span>{t('local')}</div><label class="language-control"><Icon name="globe" size={16}/><select aria-label={t('language')} value={lang} onchange={changeLanguage}><option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option></select><Icon name="down" size={13}/></label><button class="icon-button help-button" aria-label={t('help')} onclick={()=>showDialog('help')}><Icon name="help" size={20}/></button></div>
 </header>

 <main>
  {#if step===1}
  <section class="intro">
   <div class="eyebrow"><span></span>{t('eyebrow')}</div>
   <h1 bind:this={focusHeading} tabindex="-1">{t('hero1')} <span>{t('hero2')}</span></h1>
   <p>{t('intro')}</p>
   <div class="intro-benefits"><span><Icon name="check" size={14}/>{t('free')}</span><span class="benefit-divider"></span><span><Icon name="clock" size={14}/>{t('minute')}</span></div>
  </section>
  {:else}
  <div class="flow-top"><button class="text-button back-button" onclick={goBack}><Icon name="left" size={17}/>{t('back')}</button><span><Icon name="lock" size={13}/>{t('local')}</span></div>
  {/if}

  <div class="workspace" class:flow-workspace={step>1}>
   <section class="tool-panel">
    <div class="stepper" aria-label="Progress">
     {#each [t('step1'),t('step2'),t('step3')] as label,i}
      <div class:current={stage===i+1} class:complete={stage>i+1} class="step"><span class="step-number">{#if stage>i+1}<Icon name="check" size={12}/>{:else}{i+1}{/if}</span><span>{label}</span></div>{#if i<2}<span class="step-line" class:filled={stage>i+1}></span>{/if}
     {/each}
    </div>

    {#if step===1}
    <div class="form-content">
     <div class="section-heading"><h2>{t('formTitle')}</h2><p>{t('formSub')}</p></div>
     <div class="mode-tabs" role="group" aria-label="File type"><button class:active={mode==='photo'} aria-pressed={mode==='photo'} onclick={()=>setMode('photo')}><Icon name="photo" size={17}/>{t('photo')}</button><button class:active={mode==='signature'} aria-pressed={mode==='signature'} onclick={()=>setMode('signature')}><Icon name="pen" size={17}/>{t('signature')}</button></div>
     <label class="search-field"><Icon name="search" size={18}/><input type="search" placeholder={t('search')} aria-label={t('search')} bind:value={search}/><kbd>⌕</kbd></label>
     <div class="forms-label"><span>{t('popular')}</span><button onclick={()=>allForms=!allForms}>{allForms?'−':t('all')}<Icon name="arrow" size={13}/></button></div>
     <div class="preset-grid">
      {#each shown as item}
       <button class="preset" class:selected={selected===item.id} class:custom-preset={item.id==='custom'} aria-pressed={selected===item.id} onclick={()=>setPreset(item.id)}>
        <span class="preset-icon"><Icon name={item.icon} size={20}/></span><span class="preset-copy"><strong>{item.name}</strong><span>{item.id==='custom'?(lang==='hi'?'आपकी ज़रूरत का साइज़':lang==='mr'?'तुम्हाला हवा तो आकार':'Any form, your size'):item.id==='ssc-cgl'?t('signature'):item.id==='ibps'?'PO, Clerk & RRB':item.sub.split(' / ')[0]}</span></span><span class="radio-circle">{#if selected===item.id}<span></span>{/if}</span>
       </button>
      {/each}
      {#if !shown.length}<p class="no-results">{t('noResults')}</p><button class="preset custom-preset" onclick={()=>{setPreset('custom');search='';}}><Icon name="sliders"/><strong>{t('custom')}</strong></button>{/if}
     </div>
     {#if p.id==='custom'}
     <div class="custom-fields"><div class="custom-title"><strong>{t('custom')}</strong><select aria-label="Dimension unit" bind:value={custom.unit}><option value="px">Pixels</option><option value="cm">cm</option></select></div><div class="field-grid"><label>{t('width')}<input type="number" min="0.1" step="any" bind:value={custom.width}/></label><label>{t('height')}<input type="number" min="0.1" step="any" bind:value={custom.height}/></label>{#if custom.unit==='cm'}<label>DPI<input type="number" min="72" max="600" bind:value={custom.dpi}/></label>{/if}<label>{t('min')}<input type="number" min="1" bind:value={custom.minKB}/></label><label>{t('max')}<input type="number" max="2000" bind:value={custom.maxKB}/></label></div></div>
     {:else}
     <div class="requirement-strip"><Icon name={p.id==='ssc-cgl'?'info':'photo'} size={17}/><span><strong>{mode==='photo'?t('photo'):t('signature')}</strong><span class="req-dot">·</span>{spec.width} × {spec.height} px<span class="req-dot">·</span>{spec.minKB}–{spec.maxKB} KB<span class="req-dot">·</span>JPG</span></div>
     {/if}
     {#if p.id==='ssc-cgl'}<p class="small-notice">{t('liveNotice')}</p>{/if}
     {#if error}<div class="error-banner" role="alert"><Icon name="info" size={17}/>{error}</div>{/if}
     <button class="primary-button continue-button" onclick={next}>{t('continue')}<Icon name="arrow" size={19}/></button>
     <div class="privacy-note"><Icon name="lock" size={13}/>{t('noUpload')}</div>
    </div>

    {:else if step===2}
    <div class="form-content capture-content">
     <div class="selected-form-label"><Icon name={p.icon} size={15}/>{p.name}<span>·</span>{mode==='photo'?t('photo'):t('signature')}</div>
     <div class="section-heading"><h2 bind:this={focusHeading} tabindex="-1">{mode==='photo'?t('uploadTitle'):t('signTitle')}</h2><p>{mode==='photo'?t('uploadSub'):t('signSub')}</p></div>
     {#if cameraOpen}
      <div class="camera-view" class:signature-camera={mode==='signature'}><video bind:this={video} autoplay playsinline muted class:mirrored={mode==='photo'}></video><div class="camera-guide" class:ready={guidancePass}></div>{#if !cameraReady}<div class="camera-loading"><span class="spinner"></span>{t('cameraStart')}</div>{/if}<div class="camera-guidance" aria-live="polite">{cameraText}</div><button class="camera-close" onclick={stopCamera} aria-label={t('cancel')}><Icon name="close"/></button></div>
      <div class="camera-controls"><button class="text-button" onclick={()=>speech=!speech} aria-pressed={speech}><Icon name="volume" size={18}/>{t('speech')}<span class:enabled={speech} class="mini-switch"></span></button><button class="shutter-button" aria-label={t('shutter')} disabled={!cameraReady||!guidancePass} onclick={capture}><span></span></button><span class="camera-controls-spacer"></span></div>
      {#if !visionReady}<p class="muted-note">{t('manualLoading')}</p>{/if}
     {:else}
      <button class="upload-zone" onclick={openCamera}><span class="camera-illustration"><Icon name={mode==='photo'?'camera':'pen'} size={36} stroke={1.4}/><span class="little-spark"><Icon name="sparkle" size={15}/></span></span><strong>{t('camera')}</strong><span>{t('onPhone')}</span></button>
      <div class="or-divider"><span></span>{t('or')}<span></span></div>
      <button class="secondary-button gallery-button" onclick={()=>fileInput.click()}><Icon name="upload" size={18}/>{t('gallery')}</button><p class="file-hint">{t('jpg')}</p>
      <div class="capture-tips">{#each mode==='photo'?['tip1','tip2','tip3']:['sigTip1','sigTip2','sigTip3'] as key,i}<div><span>{i+1}</span>{t(key)}</div>{/each}</div>
      {#if mode==='signature'&&p.id==='upsc-cse'}<div class="three-signatures"><div><span>Signature 1</span><span>Signature 2</span><span>Signature 3</span></div><p>{t('threeSignatures')}</p></div>{/if}
      {#if p.id==='neet-ug'&&mode==='photo'}<div class="mode-tabs postcard-tabs"><button class:active={!postcard} onclick={()=>postcard=false}>{t('passport')}</button><button class:active={postcard} onclick={()=>postcard=true}>{t('postcard')}</button></div>{/if}
      {#if operator}<label class="full-field">{t('customer')}<input bind:value={customer} placeholder="e.g. Rahul Sharma"/></label>{/if}
      <button class="sample-button" onclick={runDemo}>{t('demo')}<Icon name="arrow" size={14}/></button>
     {/if}
     {#if error}<div class="error-banner" role="alert"><Icon name="info" size={17}/>{error}</div>{/if}
     <div class="privacy-note"><Icon name="lock" size={13}/>{t('cameraPrivate')}</div>
    </div>

    {:else if step===3}
    <div class="form-content review-content">
     <div class="selected-form-label"><Icon name={p.icon} size={15}/>{p.name}<span>·</span>{mode==='photo'?t('photo'):t('signature')}</div>
     <div class="section-heading"><h2 bind:this={focusHeading} tabindex="-1">{t('review')}</h2><p>{t('reviewSub')}</p></div>
     {#if sample}<div class="sample-notice"><Icon name="info" size={14}/>{t('sampleLabel')}</div>{/if}
     <div class="review-preview" class:signature-preview={mode==='signature'}><img src={outputURL} alt={mode==='photo'?'Your processed ID photo':'Your processed signature'} style:aspect-ratio={`${spec.width} / ${spec.height}`}/><span class="pixel-label">{result?.width} × {result?.height} px</span></div>
     <div class="preview-actions"><button class="text-button" onclick={()=>editing=!editing}><Icon name="sliders" size={16}/>{t('edit')}</button><button class="text-button" onclick={()=>{step=2;error='';}}><Icon name="refresh" size={15}/>{t('retake')}</button></div>
     {#if editing}
     <div class="edit-panel">{#if mode==='photo'}<label class="range-label">{t('zoom')}<input type="range" min="1" max="2" step="0.02" bind:value={adjustments.zoom}/></label><label class="range-label">{t('horizontal')}<input type="range" min="-1" max="1" step="0.02" bind:value={adjustments.x}/></label><label class="range-label">{t('vertical')}<input type="range" min="-1" max="1" step="0.02" bind:value={adjustments.y}/></label>{/if}<label class="range-label">{t('rotation')}<input type="range" min="-20" max="20" step="0.25" bind:value={adjustments.rotation}/></label>{#if mode==='photo'}<label class="checkbox-row"><input type="checkbox" bind:checked={adjustments.strip}/>{t('nameDate')}</label>{#if adjustments.strip}<div class="field-grid"><label>{t('name')}<input bind:value={adjustments.name} maxlength="48"/></label><label>{t('date')}<input bind:value={adjustments.date} maxlength="20"/></label></div><p class="muted-note">{t('stripPermission')}</p>{/if}<p class="muted-note">{t('zoomTip')}</p>{/if}<button class="secondary-button" onclick={()=>processPhoto(true)}>{t('apply')}<Icon name="check" size={16}/></button></div>
     {/if}
     {#if warning}<div class="warning-banner" role="status"><Icon name="info" size={17}/>{warning}</div>{/if}
     <div class="checklist"><div class="micro-title">{t('checks')}<span>{result?.kb.toFixed(1)} KB</span></div>{#each [[t('sizePass'),`${result?.width} × ${result?.height} px`,true],[t('kbPass'),`${spec.minKB}–${spec.maxKB} KB`,true],[t('jpgPass'),'image/jpeg',true],mode==='signature'?[t('white'),t('inkCleaned'),true]:[t('bgPass'),result?.background?t('pureWhite'):t('manual'),!!result?.background],...(mode==='photo'?[[t('facePass'),result?.face?t('detected'):t('manual'),!!result?.face],[t('sharpPass'),result?.stats?.blur>35?t('clear'):t('manual'),result?.stats?.blur>35]]:[])] as check}<div class="check-row"><span class:needs-check={!check[2]} class="check-icon"><Icon name={check[2]?'check':'info'} size={12}/></span><span>{check[0]}</span><small class:needs-check={!check[2]}>{check[1]}</small></div>{/each}</div>
     {#if mode==='photo'}<button class="background-option" onclick={toggleBackground} aria-pressed={bg}><span><Icon name="sparkle" size={16}/>{t('removeBg')}</span><span class="switch" class:on={bg}></span></button>{/if}
     {#if error}<div class="error-banner" role="alert">{error}</div>{/if}
     <button class="primary-button" onclick={download}><Icon name="download" size={18}/>{t('download')}<span class="button-meta">{result?.kb.toFixed(1)} KB</span></button><div class="privacy-note"><Icon name="lock" size={13}/>{t('noUpload')}</div>
    </div>

    {:else}
    <div class="form-content success-content">
     <span class="success-check"><Icon name="check" size={33}/></span><div class="section-heading"><h2 bind:this={focusHeading} tabindex="-1">{t('done')}</h2><p>{t('doneSub')}</p></div>
     <div class="saved-file"><img src={outputURL} alt="Your prepared file"/><div><strong>{p.name}_{mode}.jpg</strong><span>{result?.width} × {result?.height} px · {result?.kb.toFixed(1)} KB</span><span class="file-ready"><Icon name="check" size={12}/>{t('saved')}</span></div></div>
     {#if sample}<div class="sample-notice"><Icon name="info" size={14}/>{t('sampleLabel')}</div>{/if}
     <button class="secondary-button" onclick={download}><Icon name="download" size={17}/>{t('downloadAgain')}</button><p class="file-hint">{t('saveNote')}</p>
     {#if mode==='photo'}<div class="signature-cta"><span class="signature-cta-icon"><Icon name="pen" size={24}/></span><div><strong>{t('needSign')}</strong><span>{t('sameForm')}</span></div><button aria-label={t('createSign')} onclick={signatureNext}><Icon name="arrow" size={21}/></button></div>{/if}
     <div class="feedback-card">{#if feedback}<Icon name="check" size={18}/><p>{t('thanks')}</p>{:else}<p>{t('accepted')}</p><div><button onclick={()=>recordFeedback('yes')}>{t('yes')}<Icon name="check" size={13}/></button><button onclick={()=>recordFeedback('no')}>{t('notYet')}</button></div>{/if}</div>
     <button class="primary-button" onclick={share}><Icon name="share" size={17}/>{t('share')}</button><button class="sample-button" onclick={()=>restart(operator)}>{operator?t('newCustomer'):t('another')}<Icon name="arrow" size={14}/></button>
    </div>
    {/if}
   </section>

   <aside class="showcase" class:detail-showcase={step>1}>
    <div class="showcase-top"><span class="showcase-pill"><Icon name="sparkle" size={13}/> {t('littleHassle')}</span><span class="decorative-cross">+</span></div>
    {#if step===1}
    <h2>{t('showcase')}</h2><p class="showcase-subtitle">{t('showcaseSub')}</p>
    <div class="photo-comparison">
     <div class="before-photo"><div class="photo-tape"></div><img src="/assets/sample-portrait.jpg" alt="Example portrait before preparation"/><span>{t('before')}</span></div>
     <div class="comparison-arrow"><svg viewBox="0 0 54 40" fill="none"><path d="M3 20C19-1 39 1 48 19m-1-13 3 16-16-1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
     <div class="after-photo"><span class="photo-verified"><Icon name="check" size={12}/></span>{#if sampleAfter}<img src={sampleAfter} alt="Example with background replaced on this device"/>{:else}<img class="awaiting-example" src="/assets/sample-portrait.jpg" alt="Example portrait"/>{/if}<span>{t('after')}</span><div class="photo-corner tl"></div><div class="photo-corner tr"></div><div class="photo-corner bl"></div><div class="photo-corner br"></div></div>
     <span class="sparkle-one">✧</span><span class="sparkle-two">✧</span>
    </div>
    <div class="floating-file-tag"><span class="file-tag-icon"><Icon name="photo" size={15}/></span><span><strong>UPSC_photo.jpg</strong><small>420 × 540 px <span>·</span> Under 200 KB</small></span><span class="tag-check"><Icon name="check" size={12}/></span></div>
    <div class="showcase-points">{#each ['autoBg','exact','onPhone'] as key}<div><span><Icon name="check" size={12}/></span>{t(key)}</div>{/each}</div>
    <div class="showcase-footer"><Icon name="shield" size={17}/><span>{t('localBadge')}</span></div>
    {:else}
    <div class="details-heading"><span class="big-preset-icon"><Icon name={p.icon} size={31} stroke={1.4}/></span><h2>{p.name}</h2><p>{mode==='photo'?t('photo'):t('signature')}</p></div>
    <div class="spec-card"><div class="micro-title">{t('requirement')}</div><div><span>{t('dimensions')}</span><strong>{spec.width} × {spec.height} px</strong></div><div><span>{t('fileSize')}</span><strong>{spec.minKB}–{spec.maxKB} KB</strong></div><div><span>{t('format')}</span><strong>JPG / JPEG</strong></div><div><span>{t('background')}</span><strong>{t('pureWhite')}</strong></div></div>
    <div class="preset-source"><div><Icon name="info" size={17}/><strong>{t('checkNotice')}</strong></div><p>{t(`note-${p.id}`)}</p>{#if p.source}<a href={p.source} target="_blank" rel="noreferrer">{t('source')}<Icon name="external" size={13}/></a>{/if}<span>{t('unverified')} · {p.checked||'Custom'}</span></div>
    <div class="private-illustration"><Icon name="shield" size={29} stroke={1.3}/><strong>{t('private')}</strong><p>{t('noUpload')}</p></div>
    {/if}
   </aside>
  </div>

  {#if step===1}
  <section class="features" aria-label="Why ID Photo Maker">
   {#each [['crop','feature1','feature1sub'],['camera','feature2','feature2sub'],['shield','feature3','feature3sub']] as feature}<div class="feature"><span class="feature-icon"><Icon name={feature[0]} size={21} stroke={1.5}/></span><div><h3>{t(feature[1])}</h3><p>{t(feature[2])}</p></div></div>{/each}
  </section>
  {/if}
  <div class="mobile-shortcuts"><button onclick={()=>showDialog('how')}>{t('how')}</button><span>·</span><button onclick={()=>showDialog('guide')}>{t('guide')}</button></div>
 </main>
 <footer class="site-footer"><div><span class="mini-logo"><Icon name="face" size={16}/></span>{t('foot')}</div><div><span class="offline-status"><span class="status-dot"></span>{offline?t('youOffline'):offlineReady?t('offline'):t('private')}</span><button onclick={()=>showDialog('privacy')}>{t('privacy')}</button><button class:operator-active={operator} onclick={()=>{operator=!operator;notify(`${t('operator')} ${operator?'on':'off'}`);}}>{t('operator')}</button></div></footer>
</div>
<input bind:this={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onchange={receiveFile} class="visually-hidden" aria-label={t('gallery')}/>
{#if busy}<div class="processing-overlay" role="status" aria-live="polite"><div class="processing-card"><span class="processing-camera"><Icon name={mode==='photo'?'face':'pen'} size={35}/><span></span></span><h2>{t('processing')}</h2><p>{t('processingSub')}</p><div class="processing-dots"><i></i><i></i><i></i></div><small><Icon name="lock" size={13}/>{t('local')}</small></div></div>{/if}
{#if toast}<div class="toast" role="status"><Icon name="check" size={17}/>{toast}</div>{/if}
{#if dialog}
<dialog bind:this={dialogEl} class="info-dialog" onclose={()=>dialog=''} onclick={(e)=>{if(e.target===dialogEl)closeDialog();}} onkeydown={(e)=>{if(e.key==='Escape')closeDialog();}}>
 <div class="dialog-content"><button class="dialog-close icon-button" aria-label={t('close')} onclick={closeDialog}><Icon name="close"/></button>
 {#if dialog==='how'}<span class="dialog-icon"><Icon name="sparkle" size={25}/></span><h2>{t('howTitle')}</h2><div class="how-steps">{#each [1,2,3] as i}<div><span>{i}</span><div><h3>{t(`how${i}`)}</h3><p>{t(`how${i}sub`)}</p></div></div>{/each}</div><button class="primary-button" onclick={closeDialog}>{t('continue')}<Icon name="arrow" size={17}/></button>
 {:else if dialog==='guide'}<span class="dialog-icon"><Icon name="book" size={25}/></span><h2>{t('guide')}</h2><p class="dialog-intro">{t('notice')}</p><div class="guide-list">{#each presets as item}<button onclick={()=>{setPreset(item.id);step=1;closeDialog();}}><span class="preset-icon"><Icon name={item.icon} size={19}/></span><span><strong>{item.name}</strong><small>{item.photo?`${item.width} × ${item.height} px · ${item.minKB}–${item.maxKB} KB`:t('liveNotice')}</small></span><Icon name="arrow" size={16}/></button>{/each}</div>
 {:else if dialog==='privacy'}<span class="dialog-icon"><Icon name="shield" size={25}/></span><h2>{t('private')}</h2><p class="dialog-intro">{t('noUpload')}</p><div class="privacy-detail"><p>Photos, signatures and processed files stay in your browser’s memory. Closing the tab clears them. Nothing is uploaded to a server.</p><p>We save only your language choice and optional acceptance feedback on this device. This build sends no analytics.</p><p>The app and on-device processing tools can be cached for offline use. Your pictures are never added to that cache.</p></div>
 {:else}<span class="dialog-icon"><Icon name="help" size={25}/></span><h2>{t('help')}</h2><div class="help-list"><details open><summary>My camera isn’t opening</summary><p>Allow camera access in your browser settings. On a phone, use HTTPS or a localhost connection. You can always choose an existing photo from your gallery.</p></details><details><summary>My file was rejected</summary><p>Compare the current official notice with the preset. Choose Custom to set exact pixels and KB. Check your face, white background, and whether the portal requires a live photo.</p></details><details><summary>Can I use this offline?</summary><p>After the first complete load, the production build caches the app and photo tools. Keep this tab open while preparing files. The local development preview requires its server.</p></details><details><summary>Will it change my face?</summary><p>No beauty filters are applied. The tool crops, resizes, compresses and optionally replaces the background. Check hair edges before you submit.</p></details></div>{/if}
 </div>
</dialog>
{/if}
