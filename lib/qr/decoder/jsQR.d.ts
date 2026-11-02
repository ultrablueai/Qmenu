/** Local vendored jsQR 1.4.0 (Apache-2.0). Camera frames are decoded on-device. */
declare function jsQR(data: Uint8ClampedArray,width:number,height:number,options?:{inversionAttempts?:"dontInvert"|"onlyInvert"|"attemptBoth"|"invertFirst"}):{data:string}|null;
export = jsQR;
