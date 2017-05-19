/**
 * Copyright Subin Siby - http://subinsb.com
 * 
 * ------------------
 * Licensed under MIT
 * ------------------
 *
*/
(function(window){var WORKER_PATH='http://lab.subinsb.com/projects/jquery/voice/recorderWorker.js';var mp3WorkerPath='http://lab.subinsb.com/projects/jquery/voice/mp3Worker.js';var Recorder=function(source,cfg){var config=cfg||{};var bufferLen=config.bufferLen||4096;this.context=source.context;this.node=(this.context.createScriptProcessor||this.context.createJavaScriptNode).call(this.context,bufferLen,2,2);var worker=new Worker(config.workerPath||WORKER_PATH);worker.postMessage({command:'init',config:{sampleRate:this.context.sampleRate}});var recording=false,currCallback;this.node.onaudioprocess=function(e){if(!recording)return;worker.postMessage({command:'record',buffer:[e.inputBuffer.getChannelData(0),e.inputBuffer.getChannelData(1)]});}
this.configure=function(cfg){for(var prop in cfg){if(cfg.hasOwnProperty(prop)){config[prop]=cfg[prop];}}}
this.record=function(){recording=true;}
this.stop=function(){recording=false;}
this.clear=function(){worker.postMessage({command:'clear'});}
this.getBuffer=function(cb){currCallback=cb||config.callback;worker.postMessage({command:'getBuffer'})}
this.exportWAV=function(cb,type){currCallback=cb||config.callback;type=type||config.type||'audio/wav';if(!currCallback)throw new Error('Callback not set');worker.postMessage({command:'exportWAV',type:type});worker.onmessage=function(e){var blob=e.data;currCallback(blob);}}
this.exportMP3=function(cb){this.exportWAV(function(){});currCallback=cb||config.callback;var encoderWorker=new Worker(config.mp3WorkerPath||mp3WorkerPath);worker.onmessage=function(e){var blob=e.data;var arrayBuffer;var fileReader=new FileReader();fileReader.onload=function(){arrayBuffer=this.result;var buffer=new Uint8Array(arrayBuffer),data=parseWav(buffer);encoderWorker.postMessage({cmd:'init',config:{mode:3,channels:1,samplerate:data.sampleRate,bitrate:data.bitsPerSample}});encoderWorker.postMessage({cmd:'encode',buf:Uint8ArrayToFloat32Array(data.samples)});encoderWorker.onmessage=function(e){if(e.data.cmd=='data'){var url='data:audio/mp3;base64,'+ encode64(e.data.buf);currCallback(url);console.log("Done converting to Mp3");}};};fileReader.readAsArrayBuffer(blob);}}
source.connect(this.node);this.node.connect(this.context.destination);}
function parseWav(wav){function readInt(i,bytes){var ret=0,shft=0;while(bytes){ret+=wav[i]<<shft;shft+=8;i++;bytes--;}
return ret;}
if(readInt(20,2)!=1)throw'Invalid compression code, not PCM';return{sampleRate:readInt(24,4),bitsPerSample:readInt(34,2),samples:wav.subarray(44)};}
function Uint8ArrayToFloat32Array(u8a){var f32Buffer=new Float32Array(u8a.length);for(var i=0;i<u8a.length;i++){var value=u8a[i<<1]+(u8a[(i<<1)+1]<<8);if(value>=0x8000)value|=~0x7FFF;f32Buffer[i]=value/0x8000;}
return f32Buffer;}
function encode64(buffer){var binary='',bytes=new Uint8Array(buffer),len=bytes.byteLength;for(var i=0;i<len;i++){binary+=String.fromCharCode(bytes[i]);}
return window.btoa(binary);}
Recorder.forceDownload=function(blob,filename){var url=(window.URL||window.webkitURL).createObjectURL(blob);var link=window.document.createElement('a');link.href=url;link.download=filename||'output.wav';var click=document.createEvent("Event");click.initEvent("click",true,true);link.dispatchEvent(click);}
window.Recorder=Recorder;})(window);