let toolsPromise;
let detector;
let segmenter;
export function loadVision() {
  if (!toolsPromise) toolsPromise = (async () => {
    const { FilesetResolver, FaceDetector, ImageSegmenter } = await import('@mediapipe/tasks-vision');
    const files = await FilesetResolver.forVisionTasks('/vision');
    detector = await FaceDetector.createFromOptions(files, { baseOptions:{modelAssetPath:'/vision/face_detector.tflite',delegate:'CPU'},runningMode:'IMAGE',minDetectionConfidence:0.55 });
    segmenter = await ImageSegmenter.createFromOptions(files, { baseOptions:{modelAssetPath:'/vision/selfie_segmenter.tflite',delegate:'CPU'},runningMode:'IMAGE',outputCategoryMask:false,outputConfidenceMasks:true });
    return { detector, segmenter };
  })().catch(error => { toolsPromise = undefined; console.warn('On-device vision unavailable:', error.message); throw error; });
  return toolsPromise;
}
export function makeCanvas(width, height) {
 const c=document.createElement('canvas');c.width=Math.round(width);c.height=Math.round(height);return c;
}
export async function decodeFile(file) {
 if (file.size > 20*1024*1024) throw new Error('Please choose a photo under 20 MB.');
 let bitmap;
 try { bitmap=await createImageBitmap(file); } catch {throw new Error('This image could not be opened. Please choose a JPG, PNG or WebP photo.');}
 const scale=Math.min(1,1000/Math.max(bitmap.width,bitmap.height));
 const c=makeCanvas(bitmap.width*scale,bitmap.height*scale);c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();return c;
}
export function analyseCanvas(c) {
 const s=makeCanvas(120,120);const x=s.getContext('2d',{willReadFrequently:true});x.drawImage(c,0,0,120,120);const d=x.getImageData(0,0,120,120).data;
 const lum=new Float32Array(120*120);let brightness=0, edges=0, edges2=0;
 for(let i=0;i<lum.length;i++){lum[i]=d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114;brightness+=lum[i];}
 for(let y=1;y<119;y++)for(let k=1;k<119;k++){const i=y*120+k;const v=lum[i]*4-lum[i-1]-lum[i+1]-lum[i-120]-lum[i+120];edges+=v;edges2+=v*v;}
 const n=118*118;return {brightness:brightness/lum.length,blur:edges2/n-(edges/n)**2};
}
export function cameraAnalysis(canvas, signature=false) {
 const stats=analyseCanvas(canvas);let face;
 if(detector && !signature){try{face=detector.detect(canvas).detections[0]?.boundingBox;}catch{}}
 let key='ready',pass=true;
 if(stats.brightness<48){key='dark';pass=false;}
 else if(!signature&&detector&&!face){key='no-face';pass=false;}
 else if(face){
   const cx=(face.originX+face.width/2)/canvas.width, cy=(face.originY+face.height/2)/canvas.height;
   if(face.width/canvas.width<.24){key='closer';pass=false;}
   else if(face.width/canvas.width>.72){key='back';pass=false;}
   else if(Math.abs(cx-.5)>.17||cy>.7||cy<.2){key='centre';pass=false;}
 }
 return {...stats,face,key,pass,visionReady:!!detector};
}
export async function prepareSubject(source, removeBackground=true) {
 let face=null, background=false, warning='';
 let vision;
 try { vision=await loadVision(); face=vision.detector.detect(source).detections[0]?.boundingBox || null; }
 catch { warning='vision'; }
 let subject=source;
 if(removeBackground && vision) {
   let result;
   try {
     result=vision.segmenter.segment(source);
     const mask=result.confidenceMasks[0];const values=mask.getAsFloat32Array();
     const m=makeCanvas(mask.width,mask.height),mx=m.getContext('2d');const image=mx.createImageData(m.width,m.height);
     let foreground=0, uncertain=0;
     for(let i=0;i<values.length;i++){
       let v=values[i];if(v>.8)foreground++;if(v>.2&&v<.8)uncertain++;
       const a=Math.max(0,Math.min(1,(v-.15)/.7));image.data[i*4]=255;image.data[i*4+1]=255;image.data[i*4+2]=255;image.data[i*4+3]=Math.round(a*255);
     }
     if(foreground/values.length<.05 || foreground/values.length>.97 || uncertain/values.length>.45){warning='confidence';}
     else{
       mx.putImageData(image,0,0);subject=makeCanvas(source.width,source.height);const sx=subject.getContext('2d');sx.drawImage(source,0,0);sx.globalCompositeOperation='destination-in';sx.imageSmoothingEnabled=true;sx.drawImage(m,0,0,subject.width,subject.height);sx.globalCompositeOperation='source-over';background=true;
     }
   } catch {warning='vision';} finally {result?.close();}
 }
 return {subject,face,background,warning,stats:analyseCanvas(source)};
}
export function cropPhoto(prepared, spec, adjustment={}) {
 const { subject,face }=prepared;const {zoom=1,x=0,y=0,rotation=0,name='',date='',strip=false}=adjustment;
 const c=makeCanvas(spec.width,spec.height);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
 const stripHeight=strip?Math.max(30,Math.round(c.height*.12)):0;const areaHeight=c.height-stripHeight;const ratio=c.width/areaHeight;
 let cropHeight=face?Math.min(subject.height,face.height*2.6):subject.height;
 let cropWidth=cropHeight*ratio;
 if(cropWidth>subject.width){cropWidth=subject.width;cropHeight=cropWidth/ratio;}
 cropWidth/=zoom;cropHeight/=zoom;
 const centerX=face?face.originX+face.width*.5:subject.width*.5;
 const centerY=subject.height*.46;
 let left=centerX-cropWidth/2+x*subject.width*.35;
 let top=(face?face.originY-face.height*.6:centerY-cropHeight*.43)+y*subject.height*.35;
 left=Math.min(subject.width-cropWidth,Math.max(0,left));top=Math.min(subject.height-cropHeight,Math.max(0,top));
 ctx.save();ctx.translate(c.width/2,areaHeight/2);ctx.rotate(rotation*Math.PI/180);ctx.imageSmoothingQuality='high';ctx.drawImage(subject,left,top,cropWidth,cropHeight,-c.width/2,-areaHeight/2,c.width,areaHeight);ctx.restore();
 if(strip){ctx.fillStyle='#fff';ctx.fillRect(0,areaHeight,c.width,stripHeight);ctx.fillStyle='#151b18';ctx.textAlign='center';ctx.font=`600 ${Math.max(10,Math.round(stripHeight*.27))}px Arial`;ctx.fillText(name,c.width/2,areaHeight+stripHeight*.4,c.width*.94);ctx.font=`${Math.max(9,Math.round(stripHeight*.24))}px Arial`;ctx.fillText(date,c.width/2,areaHeight+stripHeight*.79,c.width*.94);}
 return c;
}
export function prepareSignature(source, spec, rotation=0) {
 const angle=rotation*Math.PI/180;const rotated=makeCanvas(source.width,source.height);const rx=rotated.getContext('2d');rx.fillStyle='#fff';rx.fillRect(0,0,rotated.width,rotated.height);rx.translate(rotated.width/2,rotated.height/2);rx.rotate(angle);rx.drawImage(source,-source.width/2,-source.height/2);
 const x=rotated.getContext('2d',{willReadFrequently:true}), img=x.getImageData(0,0,rotated.width,rotated.height),d=img.data;
 // Ink must be meaningfully darker than both white paper and the local paper tone.
 const w=rotated.width,h=rotated.height, binary=new Uint8Array(w*h);let count=0;
 const gray=new Uint8Array(w*h);for(let i=0;i<gray.length;i++)gray[i]=(d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114);
 const integral=new Float64Array((w+1)*(h+1));
 for(let yy=1;yy<=h;yy++){let sum=0;for(let xx=1;xx<=w;xx++){sum+=gray[(yy-1)*w+xx-1];integral[yy*(w+1)+xx]=integral[(yy-1)*(w+1)+xx]+sum;}}
 const radius=Math.max(12,Math.round(Math.max(w,h)/35));
 for(let yy=0;yy<h;yy++){let rowCount=0;for(let xx=0;xx<w;xx++){const i=yy*w+xx;const x1=Math.max(0,xx-radius),x2=Math.min(w,xx+radius+1),y1=Math.max(0,yy-radius),y2=Math.min(h,yy+radius+1);const mean=(integral[y2*(w+1)+x2]-integral[y1*(w+1)+x2]-integral[y2*(w+1)+x1]+integral[y1*(w+1)+x1])/((x2-x1)*(y2-y1));const ink=gray[i]<Math.min(180,mean-23);binary[i]=ink?1:0;if(ink)rowCount++;}if(rowCount>w*.65){for(let xx=0;xx<w;xx++)binary[yy*w+xx]=0;}}
 let minX=w,minY=h,maxX=0,maxY=0;
 for(let yy=1;yy<h-1;yy++)for(let xx=1;xx<w-1;xx++){const i=yy*w+xx;if(binary[i]&&(binary[i-1]+binary[i+1]+binary[i-w]+binary[i+w]>=2)){count++;minX=Math.min(minX,xx);maxX=Math.max(maxX,xx);minY=Math.min(minY,yy);maxY=Math.max(maxY,yy);}}
 if(count<12)throw new Error('No clear signature found. Use dark ink on white paper and try again.');
 for(let i=0;i<binary.length;i++){const v=binary[i]?22:255;d[i*4]=v;d[i*4+1]=v;d[i*4+2]=v;d[i*4+3]=255;}x.putImageData(img,0,0);
 const pad=8;minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(w,maxX+pad);maxY=Math.min(h,maxY+pad);
 const c=makeCanvas(spec.width,spec.height),ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);const cw=maxX-minX,ch=maxY-minY;const scale=Math.min(c.width*.9/cw,c.height*.83/ch);ctx.imageSmoothingQuality='high';ctx.drawImage(rotated,minX,minY,cw,ch,(c.width-cw*scale)/2,(c.height-ch*scale)/2,cw*scale,ch*scale);
 return {canvas:c,stats:analyseCanvas(source),inkCount:count};
}
const toBlob=(c,q)=>new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Image export failed. Please try a smaller size.')),'image/jpeg',q));
export async function compressJpeg(canvas,spec) {
 const min=Math.ceil(spec.minKB*1024),max=Math.floor(spec.maxKB*1024);
 let best=await toBlob(canvas,.98);
 if(best.size>max){let lo=.02,hi=.98;best=await toBlob(canvas,lo);if(best.size>max)throw new Error('This photo cannot fit the KB limit at these dimensions. Use a simpler background or check the Custom settings.');for(let i=0;i<10;i++){const mid=(lo+hi)/2,b=await toBlob(canvas,mid);if(b.size<=max){best=b;lo=mid;}else hi=mid;}}
 let bytes=new Uint8Array(await best.arrayBuffer());
 // Set JFIF density for physical cm/DPI presets while preserving a valid JPEG.
 if(bytes[6]===0x4a&&bytes[7]===0x46&&bytes[8]===0x49&&bytes[9]===0x46){const dpi=spec.dpi||300;bytes[13]=1;bytes[14]=dpi>>8;bytes[15]=dpi&255;bytes[16]=dpi>>8;bytes[17]=dpi&255;}
 // A valid JPEG comment pads very simple images to a portal's minimum without degrading pixels.
 if(bytes.length<min){let remaining=Math.max(4,min-bytes.length);const comments=[];while(remaining>0){const n=Math.min(65537,remaining);const size=Math.max(4,n);const comment=new Uint8Array(size);comment[0]=255;comment[1]=254;comment[2]=(size-2)>>8;comment[3]=(size-2)&255;comment.fill(32,4);comments.push(comment);remaining-=size;}const total=comments.reduce((sum,v)=>sum+v.length,0);if(bytes.length+total>max)throw new Error('The KB range is too narrow for a valid JPEG. Increase the maximum by at least 1 KB.');const padded=new Uint8Array(bytes.length+total);const insert=(bytes[2]===255&&bytes[3]===224)?4+((bytes[4]<<8)|bytes[5]):2;padded.set(bytes.subarray(0,insert));let at=insert;for(const comment of comments){padded.set(comment,at);at+=comment.length;}padded.set(bytes.subarray(insert),at);bytes=padded;}
 if(bytes.length<min||bytes.length>max)throw new Error('The file could not meet the exact KB range. Please check the requirements.');
 return new Blob([bytes],{type:'image/jpeg'});
}
