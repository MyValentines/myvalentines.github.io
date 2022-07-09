const convert = {
  "toHtml": function toHtml(string) {
    // https://stackoverflow.com/questions/14129953/how-to-encode-a-string-in-javascript-for-displaying-in-html
    return String(string).
      replace(/&/g, '&amp;').
      replace(/</g, '&lt;').
      replace(/>/g, '&gt;').
      replace(/"/g, '&quot;');
  },
  // https://developer.mozilla.org/en-US/docs/Glossary/Base64
  // Encode
  "uint6ToB64": function uint6ToB64 (nUint6) {
    return nUint6 < 26 ? nUint6 + 65
      : nUint6 < 52 ? nUint6 + 71
      : nUint6 < 62 ? nUint6 - 4
      : nUint6 === 62 ? 43
      : nUint6 === 63 ? 47 : 65;
  },
  "base64EncArr": function base64EncArr (aBytes) {
    var nMod3 = 2, sB64Enc = "";
    for (var nLen = aBytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
      nMod3 = nIdx % 3;
      if (nIdx > 0 && (nIdx * 4 / 3) % 76 === 0) { sB64Enc += "\r\n"; }
      nUint24 |= aBytes[nIdx] << (16 >>> nMod3 & 24);
      if (nMod3 === 2 || aBytes.length - nIdx === 1) {
        sB64Enc += String.fromCodePoint(convert.uint6ToB64(nUint24 >>> 18 & 63), convert.uint6ToB64(nUint24 >>> 12 & 63), convert.uint6ToB64(nUint24 >>> 6 & 63), convert.uint6ToB64(nUint24 & 63));
        nUint24 = 0;
      }
    }

    return sB64Enc.substr(0, sB64Enc.length - 2 + nMod3) + (nMod3 === 2 ? '' : nMod3 === 1 ? '=' : '==');
  },
  "strToUTF8Arr": function strToUTF8Arr (sDOMStr) {
    var aBytes, nChr, nStrLen = sDOMStr.length, nArrLen = 0;

    /* mapping... */
    for (var nMapIdx = 0; nMapIdx < nStrLen; nMapIdx++) {
      nChr = sDOMStr.codePointAt(nMapIdx);

      if (nChr > 65536) {
        nMapIdx++;
      }

      nArrLen += nChr < 0x80 ? 1 : nChr < 0x800 ? 2 : nChr < 0x10000 ? 3 : nChr < 0x200000 ? 4 : nChr < 0x4000000 ? 5 : 6;
    }

    aBytes = new Uint8Array(nArrLen);

    /* transcription... */
    for (var nIdx = 0, nChrIdx = 0; nIdx < nArrLen; nChrIdx++) {
      nChr = sDOMStr.codePointAt(nChrIdx);
      if (nChr < 128) {
        /* one byte */
        aBytes[nIdx++] = nChr;
      } else if (nChr < 0x800) {
        /* two bytes */
        aBytes[nIdx++] = 192 + (nChr >>> 6);
        aBytes[nIdx++] = 128 + (nChr & 63);
      } else if (nChr < 0x10000) {
        /* three bytes */
        aBytes[nIdx++] = 224 + (nChr >>> 12);
        aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
        aBytes[nIdx++] = 128 + (nChr & 63);
      } else if (nChr < 0x200000) {
        /* four bytes */
        aBytes[nIdx++] = 240 + (nChr >>> 18);
        aBytes[nIdx++] = 128 + (nChr >>> 12 & 63);
        aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
        aBytes[nIdx++] = 128 + (nChr & 63);
        nChrIdx++;
      } else if (nChr < 0x4000000) {
        /* five bytes */
        aBytes[nIdx++] = 248 + (nChr >>> 24);
        aBytes[nIdx++] = 128 + (nChr >>> 18 & 63);
        aBytes[nIdx++] = 128 + (nChr >>> 12 & 63);
        aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
        aBytes[nIdx++] = 128 + (nChr & 63);
        nChrIdx++;
      } else /* if (nChr <= 0x7fffffff) */ {
        /* six bytes */
        aBytes[nIdx++] = 252 + (nChr >>> 30);
        aBytes[nIdx++] = 128 + (nChr >>> 24 & 63);
        aBytes[nIdx++] = 128 + (nChr >>> 18 & 63);
        aBytes[nIdx++] = 128 + (nChr >>> 12 & 63);
        aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
        aBytes[nIdx++] = 128 + (nChr & 63);
        nChrIdx++;
      }
    }

    return aBytes;
  },
  "toBase64": function toBase64(string) {
    return convert.base64EncArr(convert.strToUTF8Arr(string));
  },
  // Decode
  "b64ToUint6": function b64ToUint6 (nChr) {
    return nChr > 64 && nChr < 91 ?
        nChr - 65
      : nChr > 96 && nChr < 123 ?
        nChr - 71
      : nChr > 47 && nChr < 58 ?
        nChr + 4
      : nChr === 43 ?
        62
      : nChr === 47 ?
        63
      :
        0;
  },
  "base64DecToArr": function base64DecToArr (sBase64, nBlocksSize) {
    var
      sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, ""), nInLen = sB64Enc.length,
      nOutLen = nBlocksSize ? Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize : nInLen * 3 + 1 >> 2, taBytes = new Uint8Array(nOutLen);

    for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
      nMod4 = nInIdx & 3;
      nUint24 |= convert.b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 6 * (3 - nMod4);
      if (nMod4 === 3 || nInLen - nInIdx === 1) {
        for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
          taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
        }
        nUint24 = 0;

      }
    }

    return taBytes;
  },
  "UTF8ArrToStr": function UTF8ArrToStr (aBytes) {
    var sView = "";

    for (var nPart, nLen = aBytes.length, nIdx = 0; nIdx < nLen; nIdx++) {
      nPart = aBytes[nIdx];
      sView += String.fromCodePoint(
        nPart > 251 && nPart < 254 && nIdx + 5 < nLen ? /* six bytes */
          /* (nPart - 252 << 30) may be not so safe in ECMAScript! So...: */
          (nPart - 252) * 1073741824 + (aBytes[++nIdx] - 128 << 24) + (aBytes[++nIdx] - 128 << 18) + (aBytes[++nIdx] - 128 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
        : nPart > 247 && nPart < 252 && nIdx + 4 < nLen ? /* five bytes */
          (nPart - 248 << 24) + (aBytes[++nIdx] - 128 << 18) + (aBytes[++nIdx] - 128 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
        : nPart > 239 && nPart < 248 && nIdx + 3 < nLen ? /* four bytes */
          (nPart - 240 << 18) + (aBytes[++nIdx] - 128 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
        : nPart > 223 && nPart < 240 && nIdx + 2 < nLen ? /* three bytes */
          (nPart - 224 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
        : nPart > 191 && nPart < 224 && nIdx + 1 < nLen ? /* two bytes */
          (nPart - 192 << 6) + aBytes[++nIdx] - 128
        : /* nPart < 127 ? */ /* one byte */
          nPart
      );
    }

    return sView;
  },
  "toString": function toString(base64) {
    return convert.UTF8ArrToStr(convert.base64DecToArr(base64));
  }
};
const vector = {
  "make": function make(original = null) {
    if(original) {
      return {
        head: original.head,
        text: original.text,
        msg: original.msg,
        footer: original.footer
      };
    } else {
      return {
        head: '<svg width="1e3" height="1e3" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"><path id="heart" fill="hsl(0,0%,90%)" stroke="hsl(0,0%,20%)" stroke-width="2" d="M 50,90 C 134,40 75,-20 50,24 25,-20 -35,43 50,90 Z"/>',
        text: '<text fill="hsl(0,0%,20%)" font-size="12px" font-family="sans-serif" font-weight="900" text-align="center" text-anchor="middle">',
        msg: '<tspan x="50" y="50">???</tspan>',
        footer: '</text><style>#heart{animation:beat 5s linear forwards infinite;}@keyframes beat{0%{stroke-width:0;}30%{stroke-width:2;}100%{stroke-width:0;}}</style><metadata><rdf:RDF><cc:Work rdf:about=""><cc:license rdf:resource="http://creativecommons.org/licenses/by-nc-sa/4.0/" /><dc:title>EnamoredValentines</dc:title><dc:creator><cc:Agent><dc:title>Hyperagon</dc:title></cc:Agent></dc:creator><dc:date>2022-05-24</dc:date></cc:Work><cc:License rdf:about="http://creativecommons.org/licenses/by-nc-sa/4.0/"><cc:permits rdf:resource="http://creativecommons.org/ns#Reproduction" /><cc:permits rdf:resource="http://creativecommons.org/ns#Distribution" /><cc:requires rdf:resource="http://creativecommons.org/ns#Notice" /><cc:requires rdf:resource="http://creativecommons.org/ns#Attribution" /><cc:prohibits rdf:resource="http://creativecommons.org/ns#CommercialUse" /><cc:permits rdf:resource="http://creativecommons.org/ns#DerivativeWorks" /><cc:requires rdf:resource="http://creativecommons.org/ns#ShareAlike" /></cc:License></rdf:RDF></metadata></svg>'
      };
    }
  },
  "toVector": function toVector(text) {
    let newVector = vector.make();

    let a = text.indexOf('<text');
    let b = text.slice(a).indexOf('>');
    newVector.head = text.substr(0, a);
    newVector.text = text.substr(a, b+1);

    let c = text.slice(a+b).indexOf('</text>');
    newVector.message = text.substr(a+b+1, c-1);
    newVector.footer = text.substr(a+b+c);
    
    return newVector;
  },
  "toSVG": function toSVG(vector, M='', S='', G='', size=12, offset=0) {
    let fs = parseInt(size);

    let split = vector.text.split('font-size="');
    let a = split[0];
    //console.log(a);
    let b = split[1].substr(split[1].indexOf('px"'));
    //console.log(b);
    vector.text = a + 'font-size="' + size.toString() + b;
    //console.log(vector.text);
    
    let to = parseInt(offset);
    vector.msg = `<tspan x="50" y="${ 55 - 1.2*fs + to }">${ M }</tspan><tspan x="50" y="${ 55 + to }">${ S }</tspan><tspan x="50" y="${ 55 + 1.2*fs + to }">${ G }</tspan>`;
    
    return (vector.head.toString()+vector.text.toString()+vector.msg.toString()+vector.footer.toString());
  }
};