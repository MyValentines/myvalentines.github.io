/*
* EV Proxy v3
* Takes care of Base64 conversion, Contract access and SVG Managing
* 2022-07-11
* by Hyperagon.zil
*/
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
var contract = {
  "address": "0x731d6C6eF47e62ae0e61f51fE21EC5a513d75C68",
  "abi": [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "walletOfOwner",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{
      "internalType": "uint256",
      "name": "_tokenId",
      "type": "uint256"
    }],
    "name":"tokenURI",
    "outputs": [{
      "internalType":"string",
      "name":"","type":"string"
    }],
    "stateMutability":"view",
    "type":"function"
  }
],
"obj": null,
"get": function getContract() {
   if (contract.obj == null) {
      if(!ethers.provider) {
        ethers.provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      }

      contract.obj = new ethers.Contract(
        contract.address,
        contract.abi,
        ethers.provider
      );
    };

    return contract.obj;
  }
};
var proxy = {
  "shorten": function shorten(address) {
    let short = `${ address.slice(0, 6	) } ... ${ address.slice(-4) }`;
    return short;
  },
  "getAddress": async function getAddress(callback) {
    if(!ethers.provider) {
      ethers.provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    }
    await ethers.provider.send("eth_requestAccounts", []).
      catch((error) => {console.error(error);}).
    then((accs) => {
      if(accs && accs.length > 0) {
        callback(accs[0]);
      } else {
        callback(null);
      }
    });
  },
  "getTokens": async function getTokens(wallet, callback) {
    let cont = contract.get();
    let finished = false;
    
    setTimeout(function() { 
      if(!finished) {
        callback([]);
      }
    }, 1000);
    
    cont.walletOfOwner(wallet).
      //then((tokens) => {callback(tokens.length);}).
      catch((error) => {
        console.error(error);
        finished = true;
        // convert array of BigNumbers to array of ints (they're under 2500)
      }).
      then((tokens) => {
        finished = true;
        // convert array of BigNumbers to array of ints
        callback(tokens.map((item) => {
              return ethers.BigNumber.from(item).toNumber();
        }));
      })
  },
  "getURI": async function getURI(id, callback) {
    let cont = contract.get();
    
    await cont.tokenURI(id).
      then((uri) => {callback(uri);}).
      catch((error) => {console.error(error);callback(0);})
  },
  "readLocal": async function readLocal(path, callback) {
    // https://stackoverflow.com/questions/26202414/javascript-get-content-of-url
    // https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser
    
    var iframe = await document.getElementById('source');
    if (!iframe) { iframe = document.createElement('iframe'); }
    iframe.id = 'source';
    iframe.style.display = "none";
    iframe.src = path;
    document.body.appendChild(iframe);
    iframe.contentWindow.document.body.onload = (event) => {
      callback(JSON.parse(event.target.body.children[0].innerText));
      //let json = JSON.parse(event.target.body.children[0].innerText);
      //console.log(json.image);
    };
  },
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
        head: '',
        text: '',
        msg: '',
        footer: ''
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
    
    // Remove Style to show Stroke
    //console.log(vector.footer.toString());
    let c = vector.footer.split('<style>')[0];
    let d = vector.footer.split('</style>')[1];

    //return (vector.head.toString()+vector.text.toString()+vector.msg.toString()+vector.footer.toString());
    return (vector.head.toString()+vector.text.toString()+vector.msg.toString()+c+d);
  }
};